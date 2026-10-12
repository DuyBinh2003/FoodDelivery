import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class UpdateDriverTripStatusUseCase {
  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
    @Inject(OrderWriteRepository)
    private readonly orderWriteRepo: OrderWriteRepository,
  ) {}

  async execute(params: {
    driverId: string;
    orderId: string;
    status: OrderStatus;
  }): Promise<Order> {
    const order = await this.orderReadRepo.findById(params.orderId);
    if (!order) {
      throw new NotFoundException('Trip not found');
    }

    if (order.driver_id !== params.driverId) {
      throw new ForbiddenException('You are not authorized to update this trip');
    }

    order.status = params.status;
    return this.orderWriteRepo.save(order);
  }
}
