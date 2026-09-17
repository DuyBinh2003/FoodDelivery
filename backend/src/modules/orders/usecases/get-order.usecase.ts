import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';

export interface GetOrderQuery {
  orderId: string;
}

@Injectable()
export class GetOrderUseCase {
  constructor(@Inject(OrderReadRepository) private readonly orderReadRepo: OrderReadRepository) {}

  async execute(query: GetOrderQuery): Promise<Order> {
    const order = await this.orderReadRepo.findById(query.orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${query.orderId} not found`);
    }
    return order;
  }
}
