import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderRedisRepository, InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';

export interface DriverTripDto {
  id: string;
  order_id: string;
  status: string;
  total_amount: number;
  driver_earnings: number;
  pickup_name: string;
  pickup_address: string;
  dropoff_address: string;
  claimed_at: Date | null;
  completed_at: Date | null;
  duration_minutes: number | null;
  created_at: Date;
  updated_at: Date;
  items: Array<{
    id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    name?: string;
  }>;
  review?: {
    id: string;
    driver_rating: number | null;
    restaurant_rating: number | null;
    comment: string | null;
    created_at: Date;
  } | null;
}

@Injectable()
export class GetDriverTripsUseCase {
  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async execute(params: { driverId: string }): Promise<DriverTripDto[]> {
    const restaurantUrl = this.configService.getOrThrow<string>('services.restaurantUrl');

    // 1. Quét các đơn đang giao trên Redis thuộc tài xế này
    const inflightOrders = await this.orderRedisRepo.getDriverInflightOrders(params.driverId);
    // 2. Lấy đơn lịch sử từ DB
    const dbOrders = await this.orderReadRepo.findTripsByDriverId(params.driverId);

    const inflightIds = new Set(inflightOrders.map((o: InflightOrderData) => o.id));
    const filteredDbOrders = dbOrders.filter((o) => !inflightIds.has(o.id));

    // Cache restaurant lookups
    const restaurantCache = new Map<string, { name: string; address: string }>();

    // Map inflight trips
    const inflightTrips: DriverTripDto[] = await Promise.all(
      inflightOrders.map(async (order: InflightOrderData) => {
        let restaurantInfo = restaurantCache.get(order.restaurant_id);
        if (!restaurantInfo && order.restaurant_id) {
          try {
            const res = await fetch(`${restaurantUrl}/internal/restaurants/${order.restaurant_id}/details`);
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

        const claimedAt = order.driver_claimed_at ? new Date(order.driver_claimed_at) : null;
        const completedAt = order.completed_at ? new Date(order.completed_at) : null;
        let durationMinutes: number | null = null;
        if (completedAt) {
          const startTime = claimedAt ? claimedAt.getTime() : new Date(order.created_at).getTime();
          durationMinutes = Math.max(1, Math.round((completedAt.getTime() - startTime) / (1000 * 60)));
        }

        return {
          id: order.id,
          order_id: order.id,
          status: order.status,
          total_amount: totalNum,
          driver_earnings: driverEarnings,
          pickup_name: restaurantInfo?.name ?? 'Nhà hàng Đối tác',
          pickup_address: restaurantInfo?.address ?? 'Địa chỉ nhà hàng',
          dropoff_address: order.delivery_address,
          claimed_at: claimedAt,
          completed_at: completedAt,
          duration_minutes: durationMinutes,
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

    // Map db trips
    const dbTrips: DriverTripDto[] = await Promise.all(
      filteredDbOrders.map(async (order) => {
        let restaurantInfo = restaurantCache.get(order.restaurant_id);
        if (!restaurantInfo && order.restaurant_id) {
          try {
            const res = await fetch(`${restaurantUrl}/internal/restaurants/${order.restaurant_id}/details`);
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

        const claimedAt = order.driver_claimed_at ? new Date(order.driver_claimed_at) : null;
        const completedAt = order.completed_at ? new Date(order.completed_at) : null;
        let durationMinutes: number | null = null;
        if (completedAt) {
          const startTime = claimedAt ? claimedAt.getTime() : (order.created_at ? new Date(order.created_at).getTime() : null);
          if (startTime) {
            durationMinutes = Math.max(1, Math.round((completedAt.getTime() - startTime) / (1000 * 60)));
          }
        }

        return {
          id: order.id,
          order_id: order.id,
          status: order.status,
          total_amount: totalNum,
          driver_earnings: driverEarnings,
          pickup_name: restaurantInfo?.name ?? 'Nhà hàng Đối tác',
          pickup_address: restaurantInfo?.address ?? 'Địa chỉ nhà hàng',
          dropoff_address: order.delivery_address,
          claimed_at: claimedAt,
          completed_at: completedAt,
          duration_minutes: durationMinutes,
          created_at: order.created_at,
          updated_at: order.updated_at,
          items: (order.items || []).map((item) => ({
            id: item.id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            unit_price: Number(item.unit_price) || 0,
          })),
          review: order.review
            ? {
                id: order.review.id,
                driver_rating: order.review.driver_rating,
                restaurant_rating: order.review.restaurant_rating,
                comment: order.review.comment,
                created_at: order.review.created_at,
              }
            : null,
        };
      }),
    );

    return [...inflightTrips, ...dbTrips].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
