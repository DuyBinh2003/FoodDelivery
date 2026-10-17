import { Injectable, Inject } from '@nestjs/common';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';

export interface RestaurantOrderDto {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  total_amount: number;
  status: string;
  delivery_address: string;
  note: string | null;
  created_at: Date;
  updated_at: Date;
  items: Array<{
    id?: string;
    menu_item_id: string;
    name?: string;
    quantity: number;
    unit_price: number;
  }>;
}

@Injectable()
export class GetRestaurantOrdersUseCase {
  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(params: { restaurantId: string }): Promise<RestaurantOrderDto[]> {
    const { restaurantId } = params;

    // 1. Quét các đơn đang xử lý trên Redis (PENDING, COOKING, READY_FOR_PICKUP, DELIVERING)
    const inflightOrders = await this.orderRedisRepo.getRestaurantInflightOrders(restaurantId);

    // 2. Lấy các đơn đã lưu DB (COMPLETED, CANCELLED)
    const dbResult = await this.orderReadRepo.findWithFilters({
      restaurant_id: restaurantId,
      page: 1,
      limit: 50,
    });
    const dbOrders = dbResult.data;

    const inflightIds = new Set(inflightOrders.map((o) => o.id));
    const filteredDbOrders = dbOrders.filter((o) => !inflightIds.has(o.id));

    // Map inflight orders
    const mappedInflight: RestaurantOrderDto[] = inflightOrders.map((o) => ({
      id: o.id,
      customer_id: o.customer_id,
      restaurant_id: o.restaurant_id,
      driver_id: o.driver_id,
      total_amount: Number(o.total_amount) || 0,
      status: o.status,
      delivery_address: o.delivery_address,
      note: o.note,
      created_at: new Date(o.created_at),
      updated_at: new Date(o.updated_at),
      items: o.items.map((i) => ({
        id: i.id,
        menu_item_id: i.menu_item_id,
        name: i.name,
        quantity: i.quantity,
        unit_price: Number(i.unit_price) || 0,
      })),
    }));

    // Map db orders
    const mappedDb: RestaurantOrderDto[] = filteredDbOrders.map((o) => ({
      id: o.id,
      customer_id: o.customer_id,
      restaurant_id: o.restaurant_id,
      driver_id: o.driver_id,
      total_amount: Number(o.total_amount) || 0,
      status: o.status,
      delivery_address: o.delivery_address,
      note: o.note,
      created_at: o.created_at,
      updated_at: o.updated_at,
      items: (o.items || []).map((i) => ({
        id: i.id,
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        unit_price: Number(i.unit_price) || 0,
      })),
    }));

    return [...mappedInflight, ...mappedDb].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
