import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async execute(query: GetOrderQuery): Promise<Order> {
    // 1. Kiểm tra trong Redis In-flight Cache trước (Đơn hàng đang trong quá trình luân chuyển)
    const inflight = await this.orderRedisRepo.getInflightOrder(query.orderId);

    const targetRestaurantId = inflight ? inflight.restaurant_id : null;
    let restaurantInfo: { name: string; address?: string } | null = null;

    if (targetRestaurantId) {
      try {
        const restUrl = this.configService.getOrThrow<string>('services.restaurantUrl');
        const res = await fetch(`${restUrl}/internal/restaurants/${targetRestaurantId}/details`);
        if (res.ok) {
          restaurantInfo = (await res.json().catch(() => null)) as { name: string; address?: string };
        }
      } catch (_e) {
        // Ignore fetch error
      }
    }

    const targetDriverId = inflight ? inflight.driver_id : null;
    let driverInfo: { id: string; name: string; phone?: string; vehicle_plate?: string; vehicle_type?: string } | null = null;
    if (targetDriverId) {
      driverInfo = {
        id: targetDriverId,
        name: 'Nguyễn Văn Tài (Tài xế FoodDelivery)',
        phone: '0901 234 567',
        vehicle_plate: '59-X1 888.88',
        vehicle_type: 'Honda AirBlade (Đỏ Đen)',
      };
    }

    if (inflight) {
      return {
        id: inflight.id,
        customer_id: inflight.customer_id,
        restaurant_id: inflight.restaurant_id,
        restaurant_name: restaurantInfo?.name || inflight.restaurant_name || 'Nhà hàng Đối tác',
        restaurant_address: restaurantInfo?.address || 'Địa chỉ nhà hàng',
        driver_id: inflight.driver_id,
        driver: driverInfo,
        total_amount: inflight.total_amount,
        status: inflight.status,
        delivery_address: inflight.delivery_address,
        note: inflight.note,
        estimated_delivery_time: inflight.status === 'DELIVERING' ? '15 - 20 phút' : '20 - 30 phút',
        payment_method: inflight.payment_method,
        created_at: new Date(inflight.created_at),
        updated_at: new Date(inflight.updated_at),
        is_deleted: false,
        items: inflight.items.map((i) => ({
          id: i.id || i.menu_item_id,
          order_id: inflight.id,
          menu_item_id: i.menu_item_id,
          name: i.name || 'Món ăn đặc sản',
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

    if (order.restaurant_id && !restaurantInfo) {
      try {
        const restUrl = this.configService.getOrThrow<string>('services.restaurantUrl');
        const res = await fetch(`${restUrl}/internal/restaurants/${order.restaurant_id}/details`);
        if (res.ok) {
          restaurantInfo = (await res.json().catch(() => null)) as { name: string; address?: string };
        }
      } catch (_e) {
        // Ignore fetch error
      }
    }

    if (order.driver_id && !driverInfo) {
      driverInfo = {
        id: order.driver_id,
        name: 'Nguyễn Văn Tài (Tài xế FoodDelivery)',
        phone: '0901 234 567',
        vehicle_plate: '59-X1 888.88',
        vehicle_type: 'Honda AirBlade (Đỏ Đen)',
      };
    }

    return {
      ...order,
      restaurant_name: restaurantInfo?.name || (order as any).restaurant_name || 'Nhà hàng Đối tác',
      restaurant_address: restaurantInfo?.address || 'Địa chỉ nhà hàng',
      driver: driverInfo,
    } as unknown as Order;
  }
}
