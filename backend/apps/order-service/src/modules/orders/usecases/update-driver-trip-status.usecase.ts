import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { SqsService } from '@/common/messaging/sqs.service.js';
import { OrderEventTypes } from '@/events/index.js';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class UpdateDriverTripStatusUseCase {
  private readonly logger = new Logger(UpdateDriverTripStatusUseCase.name);

  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
    @Inject(OrderWriteRepository)
    private readonly orderWriteRepo: OrderWriteRepository,
    @Inject(SqsService)
    private readonly sqsService: SqsService,
  ) {}

  private async settleTripCommission(orderId: string, driverId: string, totalAmount: number | string) {
    const paymentUrl = process.env.PAYMENT_SERVICE_URL;
    if (!paymentUrl) {
      this.logger.warn('[UpdateDriverTripStatusUseCase] PAYMENT_SERVICE_URL not configured, skipping trip settlement');
      return;
    }
    try {
      const res = await fetch(`${paymentUrl}/internal/ledger/settle-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          driverId,
          tripAmount: totalAmount || 25000,
          feeRate: 10,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`[UpdateDriverTripStatusUseCase] Payment-service returned status ${res.status} when settling trip for order ${orderId}`);
      }
    } catch (error: unknown) {
      this.logger.warn(`[UpdateDriverTripStatusUseCase] Failed to reach payment-service for trip settlement:`, error);
    }
  }

  async execute(params: {
    driverId: string;
    orderId: string;
    status: OrderStatus;
  }): Promise<Order> {
    // 1. Kiểm tra đơn hàng trong Redis In-flight Cache trước
    const inflight = await this.orderRedisRepo.getInflightOrder(params.orderId);
    if (inflight) {
      if (inflight.driver_id && inflight.driver_id !== params.driverId) {
        throw new ForbiddenException('You are not authorized to update this trip');
      }

      // Cập nhật trạng thái và tài xế trong Redis trước
      const updatedInflight = await this.orderRedisRepo.updateStatus(params.orderId, params.status, {
        driver_id: params.driverId,
      });

      // Khi tài xế bấm COMPLETED: Ghi toàn bộ dữ liệu vào PostgreSQL (Deferred Persistence)
      if (params.status === OrderStatus.COMPLETED) {
        const savedOrder = await this.orderWriteRepo.persistCompletedOrder({
          ...(updatedInflight || inflight),
          driver_id: params.driverId,
          status: OrderStatus.COMPLETED,
        });
        await this.orderRedisRepo.publishOrderEvent(params.orderId, savedOrder);
        await this.orderRedisRepo.setTtl(params.orderId, 1800);

        // Phát sự kiện ORDER_STATUS_CHANGED vào SQS để các bên theo dõi
        await this.sqsService.publishEvent(OrderEventTypes.ORDER_STATUS_CHANGED, {
          orderId: params.orderId,
          previousStatus: inflight.status,
          newStatus: OrderStatus.COMPLETED,
          changedAt: new Date().toISOString(),
          changedBy: `driver:${params.driverId}`,
        });

        // Bút toán chiết khấu cuốc xe tài xế sang ví nền tảng (bất đồng bộ)
        this.settleTripCommission(params.orderId, params.driverId, savedOrder.total_amount).catch((err: unknown) => {
          this.logger.warn(`Failed background trip settlement for order ${params.orderId}:`, err);
        });

        return savedOrder;
      }

      // Phát sự kiện ORDER_STATUS_CHANGED vào SQS
      await this.sqsService.publishEvent(OrderEventTypes.ORDER_STATUS_CHANGED, {
        orderId: params.orderId,
        previousStatus: inflight.status,
        newStatus: params.status,
        changedAt: new Date().toISOString(),
        changedBy: `driver:${params.driverId}`,
      });

      return {
        id: inflight.id,
        customer_id: inflight.customer_id,
        restaurant_id: inflight.restaurant_id,
        driver_id: params.driverId,
        total_amount: inflight.total_amount,
        status: params.status,
        delivery_address: inflight.delivery_address,
        note: inflight.note,
        estimated_delivery_time: null,
        payment_method: inflight.payment_method,
        created_at: new Date(inflight.created_at),
        updated_at: new Date(),
        is_deleted: false,
        items: inflight.items as unknown as Order['items'],
      } as unknown as Order;
    }

    // 2. Fallback: Nếu không có trong Redis, cập nhật trong PostgreSQL
    const order = await this.orderReadRepo.findById(params.orderId);
    if (!order) {
      throw new NotFoundException('Trip not found');
    }

    if (order.driver_id && order.driver_id !== params.driverId) {
      throw new ForbiddenException('You are not authorized to update this trip');
    }

    const previousStatus = order.status;
    order.status = params.status;
    order.driver_id = params.driverId;
    const saved = await this.orderWriteRepo.save(order);

    await this.sqsService.publishEvent(OrderEventTypes.ORDER_STATUS_CHANGED, {
      orderId: params.orderId,
      previousStatus,
      newStatus: params.status,
      changedAt: new Date().toISOString(),
      changedBy: `driver:${params.driverId}`,
    });

    if (params.status === OrderStatus.COMPLETED) {
      this.settleTripCommission(params.orderId, params.driverId, saved.total_amount).catch((err: unknown) => {
        this.logger.warn(`Failed background trip settlement for order ${params.orderId}:`, err);
      });
    }

    return saved;
  }
}
