import { Injectable } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class GetOrderHistoryUseCase {
  constructor(private readonly orderReadRepo: OrderReadRepository) {}

  async execute(params: { customerId: string }): Promise<Order[]> {
    return this.orderReadRepo.findHistoryByCustomerId(params.customerId);
  }
}
