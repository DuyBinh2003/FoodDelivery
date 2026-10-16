import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';
import { UpdateOrderStatusDto } from '@/modules/orders/dto/update-order-status.dto.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { OrderEventTypes } from '@/events/index.js';

export interface UpdateOrderStatusCommand {
  orderId: string;
  dto: UpdateOrderStatusDto;
  changedBy?: string;
}

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(OrderReadRepository) private readonly orderReadRepo: OrderReadRepository,
    @Inject(OrderWriteRepository) private readonly orderWriteRepo: OrderWriteRepository,
    @Inject(SqsService) private readonly sqsService: SqsService,
  ) {}

  async execute(command: UpdateOrderStatusCommand): Promise<Order> {
    const order = await this.orderReadRepo.findById(command.orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${command.orderId} not found`);
    }

    const previousStatus = order.status;
    order.status = command.dto.status;
    const saved = await this.orderWriteRepo.save(order);

    // Publish ORDER_STATUS_CHANGED for every transition
    await this.sqsService.publishEvent(OrderEventTypes.ORDER_STATUS_CHANGED, {
      orderId: saved.id,
      previousStatus,
      newStatus: saved.status,
      changedAt: new Date().toISOString(),
      changedBy: command.changedBy,
    });

    // Publish ORDER_ACCEPTED specifically when restaurant accepts
    if (saved.status === OrderStatus.ACCEPTED) {
      await this.sqsService.publishEvent(OrderEventTypes.ORDER_ACCEPTED, {
        orderId: saved.id,
        restaurantId: saved.restaurant_id,
        customerId: saved.customer_id,
      });
    }

    return saved;
  }
}

