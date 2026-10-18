import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async execute(command: ClaimDriverTripCommand): Promise<Order> {
    const { orderId, driverId } = command;

    // 1. Kiểm tra trạng thái hoạt động của tài xế qua user-service
    const userUrl = this.configService.getOrThrow<string>('services.userUrl');
    try {
      const statusRes = await fetch(`${userUrl}/internal/drivers/${driverId}/status`);
      if (statusRes.ok) {
        const statusData = (await statusRes.json().catch(() => null)) as {
          is_driver: boolean;
          is_active: boolean;
          status: string;
          verification_status: string;
        } | null;

        if (!statusData || !statusData.is_active) {
          throw new ForbiddenException(
            'Tài xế đang ở trạng thái Ngoại tuyến hoặc chưa được kích hoạt. Vui lòng bật Trực tuyến để nhận chuyến.',
          );
        }
      } else {
        throw new ForbiddenException('Không tìm thấy thông tin tài xế hợp lệ');
      }
    } catch (err: unknown) {
      if (err instanceof ForbiddenException) throw err;
      throw new ForbiddenException('Không thể xác thực trạng thái tài xế vào lúc này.');
    }

    // 2. Thực hiện Atomic Claim trên Redis
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
