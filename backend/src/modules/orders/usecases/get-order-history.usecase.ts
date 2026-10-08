import { Injectable, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class GetOrderHistoryUseCase {
  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository
  ) {}

  async execute(params: { customerId: string }): Promise<Order[]> {
    return this.orderReadRepo.findHistoryByCustomerId(params.customerId);
  }
}
