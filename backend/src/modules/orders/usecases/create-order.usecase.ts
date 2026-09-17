import { Injectable, Inject } from '@nestjs/common';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';

@Injectable()
export class CreateOrderUseCase {
  constructor(@Inject(OrderWriteRepository) private readonly orderWriteRepo: OrderWriteRepository) {}

  async execute(dto: CreateOrderDto): Promise<Order> {
    // Business validation could go here
    return this.orderWriteRepo.createOrderWithItems(dto);
  }
}
