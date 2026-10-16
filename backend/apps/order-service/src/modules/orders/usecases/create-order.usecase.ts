import { Injectable, Inject } from '@nestjs/common';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { CreateOrderDto } from '@/modules/orders/dto/create-order.dto.js';

export interface CreateOrderCommand extends CreateOrderDto {
  /** customer_id lấy từ JWT payload, không nhận từ body */
  customer_id: string;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(@Inject(OrderWriteRepository) private readonly orderWriteRepo: OrderWriteRepository) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    return this.orderWriteRepo.createOrderWithItems(command);
  }
}

