import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';

export interface GetOrderQuery {
  orderId: string;
}

@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(OrderRedisRepository) private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(OrderReadRepository) private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(query: GetOrderQuery): Promise<Order> {
    // 1. Kiểm tra trong Redis In-flight Cache trước (Đơn hàng đang trong quá trình luân chuyển)
    const inflight = await this.orderRedisRepo.getInflightOrder(query.orderId);
    if (inflight) {
      return {
        id: inflight.id,
        customer_id: inflight.customer_id,
        restaurant_id: inflight.restaurant_id,
        driver_id: inflight.driver_id,
        total_amount: inflight.total_amount,
        status: inflight.status,
        delivery_address: inflight.delivery_address,
        note: inflight.note,
        estimated_delivery_time: null,
        payment_method: inflight.payment_method,
        created_at: new Date(inflight.created_at),
        updated_at: new Date(inflight.updated_at),
        is_deleted: false,
        items: inflight.items.map((i) => ({
          id: i.id || i.menu_item_id,
          order_id: inflight.id,
          menu_item_id: i.menu_item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          created_at: new Date(inflight.created_at),
        })),
      } as unknown as Order;
    }

    // 2. Nếu không có trong Redis, truy vấn xuống PostgreSQL (Đơn đã hoàn thành/hủy trong quá khứ)
    const order = await this.orderReadRepo.findById(query.orderId);
    if (!order) {
      throw new NotFoundException(`Order with ID ${query.orderId} not found`);
    }
    return order;
  }
}
