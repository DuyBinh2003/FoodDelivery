import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '@/modules/orders/entities/order.entity.js';

@Controller('internal')
export class OrdersInternalController {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>
  ) {}

  @Get('orders/metrics')
  async getMetrics() {
    const totalOrders = await this.orderRepo.count();
    const { gmv } = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.total_amount)', 'gmv')
      .where('order.status = :status', { status: 'COMPLETED' })
      .getRawOne();
    
    return {
      totalOrders,
      totalGmv: parseFloat(gmv || '0')
    };
  }

  @Patch('orders/:id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (order) {
      order.status = status as any;
      await this.orderRepo.save(order);
    }
    return order;
  }
}
