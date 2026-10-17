import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { Order, OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class UpdateDriverTripStatusUseCase {
  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
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
    // 1. Kiểm tra đơn hàng trong Redis In-flight Cache trước
    const inflight = await this.orderRedisRepo.getInflightOrder(params.orderId);
    if (inflight) {
      if (inflight.driver_id && inflight.driver_id !== params.driverId) {
        throw new ForbiddenException('You are not authorized to update this trip');
      }

      // Khi tài xế bấm COMPLETED: Ghi toàn bộ dữ liệu vào PostgreSQL
      if (params.status === OrderStatus.COMPLETED) {
        const savedOrder = await this.orderWriteRepo.persistCompletedOrder({
          ...inflight,
          driver_id: params.driverId,
          status: OrderStatus.COMPLETED,
        });
        await this.orderRedisRepo.setTtl(params.orderId, 1800);
        return savedOrder;
      }

      // Cập nhật trạng thái và tài xế trong Redis
      await this.orderRedisRepo.updateStatus(params.orderId, params.status, {
        driver_id: params.driverId,
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
        items: inflight.items as any,
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

    order.status = params.status;
    order.driver_id = params.driverId;
    return this.orderWriteRepo.save(order);
  }
}
