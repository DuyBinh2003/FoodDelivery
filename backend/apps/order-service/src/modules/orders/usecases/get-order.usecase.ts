import { Injectable, NotFoundException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { Order } from '@/modules/orders/entities/order.entity.js';

export interface GetOrderQuery {
  orderId: string;
}

@Injectable()
export class GetOrderUseCase {
  private readonly logger = new Logger(GetOrderUseCase.name);

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
        } else {
          this.logger.warn(`Restaurant-service returned status ${res.status} for restaurant ${targetRestaurantId}`);
        }
      } catch (error: unknown) {
        this.logger.warn(`Failed to fetch restaurant details for order ${query.orderId}:`, error);
      }
    }

    const targetDriverId = inflight ? inflight.driver_id : null;
    let driverInfo: { id: string; name: string; phone?: string; vehicle_plate?: string; vehicle_type?: string } | null = null;
    if (targetDriverId) {
      try {
        const userUrl = this.configService.getOrThrow<string>('services.userUrl');
        const res = await fetch(`${userUrl}/internal/drivers/${targetDriverId}/status`);
        if (res.ok) {
          const driverStatus = (await res.json().catch(() => null)) as {
            vehicle_plate?: string;
            vehicle_type?: string;
          } | null;
          driverInfo = {
            id: targetDriverId,
            name: 'Tài xế giao hàng',
            vehicle_plate: driverStatus?.vehicle_plate || undefined,
            vehicle_type: driverStatus?.vehicle_type || undefined,
          };
        }
      } catch (error: unknown) {
        this.logger.warn(`Failed to fetch driver info for driver ${targetDriverId}:`, error);
        driverInfo = {
          id: targetDriverId,
          name: 'Tài xế giao hàng',
        };
      }
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
        subtotal: inflight.subtotal ?? (Number(inflight.total_amount) > 15000 ? Number(inflight.total_amount) - 15000 : Number(inflight.total_amount)),
        delivery_fee: inflight.delivery_fee ?? 15000,
        total_amount: inflight.total_amount,
        status: inflight.status,
        delivery_address: inflight.delivery_address,
        note: inflight.note,
        estimated_delivery_time: inflight.status === 'DELIVERING' ? '15 - 20 phút' : '20 - 30 phút',
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
          name: i.name || 'Món ăn đặc sản',
          quantity: i.quantity,
          unit_price: i.unit_price,
          options: i.options,
          notes: i.notes,
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
        } else {
          this.logger.warn(`Restaurant-service returned status ${res.status} for restaurant ${order.restaurant_id}`);
        }
      } catch (error: unknown) {
        this.logger.warn(`Failed to fetch restaurant details for order ${query.orderId}:`, error);
      }
    }

    if (order.driver_id && !driverInfo) {
      try {
        const userUrl = this.configService.getOrThrow<string>('services.userUrl');
        const res = await fetch(`${userUrl}/internal/drivers/${order.driver_id}/status`);
        if (res.ok) {
          const driverStatus = (await res.json().catch(() => null)) as {
            vehicle_plate?: string;
            vehicle_type?: string;
          } | null;
          driverInfo = {
            id: order.driver_id,
            name: 'Tài xế giao hàng',
            vehicle_plate: driverStatus?.vehicle_plate || undefined,
            vehicle_type: driverStatus?.vehicle_type || undefined,
          };
        }
      } catch (error: unknown) {
        this.logger.warn(`Failed to fetch driver info for driver ${order.driver_id}:`, error);
        driverInfo = {
          id: order.driver_id,
          name: 'Tài xế giao hàng',
        };
      }
    }

    return {
      ...order,
      restaurant_name: restaurantInfo?.name || (order as any).restaurant_name || 'Nhà hàng Đối tác',
      restaurant_address: restaurantInfo?.address || 'Địa chỉ nhà hàng',
      driver: driverInfo,
    } as unknown as Order;
  }
}
