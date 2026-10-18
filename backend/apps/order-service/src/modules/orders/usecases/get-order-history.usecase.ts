import { Injectable, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class GetOrderHistoryUseCase {
  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(params: { customerId: string }): Promise<Order[]> {
    // 1. Lấy danh sách các đơn đang chạy từ Redis
    const inflightOrders = await this.orderRedisRepo.getCustomerInflightOrders(params.customerId);

    // 2. Lấy danh sách các đơn trong quá khứ từ PostgreSQL
    const dbOrders = await this.orderReadRepo.findHistoryByCustomerId(params.customerId);

    // 3. Chuẩn hóa format đơn từ Redis
    const mappedInflight: Order[] = inflightOrders.map((inflight) => ({
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
      cooking_at: inflight.cooking_at ? new Date(inflight.cooking_at) : null,
      ready_at: inflight.ready_at ? new Date(inflight.ready_at) : null,
      driver_claimed_at: inflight.driver_claimed_at ? new Date(inflight.driver_claimed_at) : null,
      completed_at: inflight.completed_at ? new Date(inflight.completed_at) : null,
      cancelled_at: inflight.cancelled_at ? new Date(inflight.cancelled_at) : null,
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
    } as unknown as Order));

    // Lọc bỏ trùng lặp nếu đơn vừa mới được dump vào DB
    const inflightIds = new Set(mappedInflight.map((o) => o.id));
    const filteredDbOrders = dbOrders.filter((o) => !inflightIds.has(o.id));

    return [...mappedInflight, ...filteredDbOrders];
  }
}
