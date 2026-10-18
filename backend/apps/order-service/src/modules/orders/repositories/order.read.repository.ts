import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { QueryOrdersDto } from '@/modules/orders/dto/query-orders.dto.js';

@Injectable()
export class OrderReadRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async findById(id: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { id, is_deleted: false },
      relations: { items: true, review: true },
    });
  }

  async findHistoryByCustomerId(customerId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { customer_id: customerId, is_deleted: false },
      relations: { items: true, review: true },
      order: { created_at: 'DESC' },
    });
  }

  async findTripsByDriverId(driverId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { driver_id: driverId, is_deleted: false },
      relations: { items: true, review: true },
      order: { created_at: 'DESC' },
    });
  }

  async findWithFilters(query: QueryOrdersDto & { search?: string }): Promise<{ data: Order[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.is_deleted = false');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.restaurant_id) {
      qb.andWhere('order.restaurant_id = :restaurantId', { restaurantId: query.restaurant_id });
    }

    if (query.customer_id) {
      qb.andWhere('order.customer_id = :customerId', { customerId: query.customer_id });
    }

    if (query.search) {
      qb.andWhere('(order.id::text ILIKE :search OR order.note ILIKE :search OR order.delivery_address ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    if (query.from_date) {
      qb.andWhere('order.created_at >= :fromDate', { fromDate: query.from_date });
    }

    if (query.to_date) {
      qb.andWhere('order.created_at <= :toDate', { toDate: query.to_date });
    }

    const [data, total] = await qb
      .orderBy('order.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async getAnalyticsTimeSeries(range: '7d' | '30d' | 'all' = '7d'): Promise<{
    timeseries: Array<{ date: string; gmv: number; orders: number; completed_orders: number }>;
    statusDistribution: Record<string, number>;
  }> {
    let days = 7;
    if (range === '30d') days = 30;
    else if (range === 'all') days = 90;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Group by Date for Timeseries
    const rawTimeseries = await this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(order.id)::int', 'orders')
      .addSelect("SUM(CASE WHEN order.status = 'COMPLETED' THEN order.total_amount ELSE 0 END)::numeric", 'gmv')
      .addSelect("COUNT(CASE WHEN order.status = 'COMPLETED' THEN 1 END)::int", 'completed_orders')
      .where('order.is_deleted = false')
      .andWhere('order.created_at >= :fromDate', { fromDate })
      .groupBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(order.created_at, 'YYYY-MM-DD')", 'ASC')
      .getRawMany<{ date: string; orders: number; gmv: string; completed_orders: number }>();

    const timeseries = rawTimeseries.map((r) => ({
      date: r.date,
      orders: Number(r.orders) || 0,
      gmv: Number(r.gmv) || 0,
      completed_orders: Number(r.completed_orders) || 0,
    }));

    // Status counts
    const rawStatus = await this.countByStatus();
    const statusDistribution: Record<string, number> = {};
    for (const item of rawStatus) {
      statusDistribution[item.status] = Number(item.count) || 0;
    }

    return {
      timeseries,
      statusDistribution,
    };
  }

  async countByStatus(): Promise<{ status: string; count: string }[]> {
    return this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.is_deleted = false')
      .groupBy('order.status')
      .getRawMany<{ status: string; count: string }>();
  }

  async sumCompletedAmount(): Promise<number> {
    const result = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.total_amount)', 'gmv')
      .where('order.status = :status', { status: 'COMPLETED' })
      .andWhere('order.is_deleted = false')
      .getRawOne<{ gmv: string | null }>();

    return parseFloat(result?.gmv ?? '0');
  }

  async countTotal(): Promise<number> {
    return this.orderRepo.count({ where: { is_deleted: false } });
  }
}


