import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { OrderEventTypes } from '@/events/index.js';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';

export interface ClaimDriverTripCommand {
  orderId: string;
  driverId: string;
}

@Injectable()
export class ClaimDriverTripUseCase {
  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(SqsService)
    private readonly sqsService: SqsService,
  ) {}

  async execute(command: ClaimDriverTripCommand): Promise<Order> {
    const { orderId, driverId } = command;

    // 1. Thực hiện Atomic Claim trên Redis
    const claimResult = await this.orderRedisRepo.claimOrder(orderId, driverId);

    if (!claimResult.success) {
      if (claimResult.error === 'NOT_FOUND') {
        throw new NotFoundException(`Không tìm thấy cuốc xe với mã ${orderId}`);
      }
      // CONFLICT: Đơn đã có tài xế khác nhận hoặc không ở trạng thái sẵn sàng
      throw new ConflictException(
        'Rất tiếc! Cuốc xe này đã được tài xế khác nhận nhanh hơn.',
      );
    }

    const orderData = claimResult.order!;

    // 2. Phát sự kiện ORDER_STATUS_CHANGED vào SQS để các bên theo dõi
    await this.sqsService.publishEvent(OrderEventTypes.ORDER_STATUS_CHANGED, {
      orderId: orderData.id,
      previousStatus: OrderStatus.READY_FOR_PICKUP,
      newStatus: OrderStatus.DELIVERING,
      changedAt: new Date().toISOString(),
      changedBy: `driver:${driverId}`,
    });

    return {
      id: orderData.id,
      customer_id: orderData.customer_id,
      restaurant_id: orderData.restaurant_id,
      driver_id: driverId,
      total_amount: orderData.total_amount,
      status: OrderStatus.DELIVERING,
      delivery_address: orderData.delivery_address,
      note: orderData.note,
      estimated_delivery_time: null,
      payment_method: orderData.payment_method,
      created_at: new Date(orderData.created_at),
      updated_at: new Date(orderData.updated_at),
      is_deleted: false,
      items: orderData.items as unknown as Order['items'],
    } as unknown as Order;
  }
}
