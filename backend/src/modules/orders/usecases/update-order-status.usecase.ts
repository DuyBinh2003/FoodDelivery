import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';

export interface UpdateOrderStatusCommand {
  orderId: string;
  dto: UpdateOrderStatusDto;
}

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(OrderReadRepository) private readonly orderReadRepo: OrderReadRepository,
    @Inject(OrderWriteRepository) private readonly orderWriteRepo: OrderWriteRepository,
  ) {}

  async execute(command: UpdateOrderStatusCommand): Promise<Order> {
    const order = await this.orderReadRepo.findById(command.orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${command.orderId} not found`);
    }

    order.status = command.dto.status;
    return this.orderWriteRepo.save(order);
  }
}
