import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderRedisRepository, InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';
import type { DriverTripDto } from '@/modules/orders/usecases/get-driver-trips.usecase.js';

@Injectable()
export class GetAvailableDriverTripsUseCase {
  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async execute(driverUserId?: string): Promise<DriverTripDto[]> {
    if (driverUserId) {
      const userUrl = this.configService.getOrThrow<string>('services.userUrl');
      try {
        const statusRes = await fetch(`${userUrl}/internal/drivers/${driverUserId}/status`);
        if (statusRes.ok) {
          const statusData = (await statusRes.json().catch(() => null)) as {
            is_driver: boolean;
            is_active: boolean;
            status: string;
            verification_status: string;
          } | null;

          // Nếu tài xế không active (OFFLINE hoặc chưa APPROVED), lập tức trả về mảng rỗng
          if (!statusData || !statusData.is_active) {
            return [];
          }
        } else {
          return [];
        }
      } catch (_e) {
        // Khi không thể kết nối tới user-service, ngắt an toàn không phát tán đơn
        return [];
      }
    }

    const restaurantUrl = this.configService.getOrThrow<string>('services.restaurantUrl');

    // 1. Quét các đơn đang ở trạng thái READY_FOR_PICKUP hoặc ACCEPTED mà driver_id đang null
    const availableOrders = await this.orderRedisRepo.getAvailablePickupOrders();
    if (!availableOrders || availableOrders.length === 0) return [];

    const restaurantCache = new Map<string, { name: string; address: string }>();

    const trips: DriverTripDto[] = await Promise.all(
      availableOrders.map(async (order: InflightOrderData) => {
        let restaurantInfo = restaurantCache.get(order.restaurant_id);

        if (!restaurantInfo && order.restaurant_id) {
          try {
            const res = await fetch(
              `${restaurantUrl}/internal/restaurants/${order.restaurant_id}/details`,
            );
            if (res.ok) {
              const resData = await res.json().catch(() => null);
              if (resData) {
                restaurantInfo = {
                  name: resData.name,
                  address: resData.address,
                };
                restaurantCache.set(order.restaurant_id, restaurantInfo);
              }
            }
          } catch (_e) {
            // Ignore error
          }
        }

        const baseFee = 25000;
        const totalNum = Number(order.total_amount) || 0;
        const commission = Math.round((totalNum * 0.1) / 1000) * 1000;
        const driverEarnings = baseFee + commission;

        return {
          id: order.id,
          order_id: order.id,
          status: order.status,
          total_amount: totalNum,
          driver_earnings: driverEarnings,
          pickup_name: restaurantInfo?.name ?? 'Nhà hàng Đối tác',
          pickup_address: restaurantInfo?.address ?? 'Địa chỉ lấy hàng',
          dropoff_address: order.delivery_address,
          created_at: new Date(order.created_at),
          updated_at: new Date(order.updated_at),
          items: (order.items || []).map((item: InflightOrderData['items'][number]) => ({
            id: item.id ?? item.menu_item_id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            unit_price: Number(item.unit_price) || 0,
          })),
          review: null,
        };
      }),
    );

    return trips.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
