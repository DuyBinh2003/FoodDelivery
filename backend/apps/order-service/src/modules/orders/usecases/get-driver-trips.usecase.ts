import { Injectable, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';

export interface DriverTripDto {
  id: string;
  order_id: string;
  status: string;
  total_amount: number;
  driver_earnings: number;
  pickup_name: string;
  pickup_address: string;
  dropoff_address: string;
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
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';

  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(params: { driverId: string }): Promise<DriverTripDto[]> {
    const orders = await this.orderReadRepo.findTripsByDriverId(params.driverId);
    if (!orders || orders.length === 0) return [];

    // Cache restaurant lookups
    const restaurantCache = new Map<string, { name: string; address: string }>();

    const trips: DriverTripDto[] = await Promise.all(
      orders.map(async (order) => {
        let restaurantInfo = restaurantCache.get(order.restaurant_id);

        if (!restaurantInfo && order.restaurant_id) {
          try {
            const res = await fetch(`${this.restaurantUrl}/internal/restaurants/${order.restaurant_id}/details`);
            if (res.ok) {
              const resData = await res.json().catch(() => null);
              if (resData) {
                restaurantInfo = {
                  name: resData.name || 'Nhà hàng',
                  address: resData.address || 'Địa chỉ nhà hàng',
                };
                restaurantCache.set(order.restaurant_id, restaurantInfo);
              }
            }
          } catch (_e) {
            // Fallback if restaurant service is unavailable
          }
        }

        if (!restaurantInfo) {
          restaurantInfo = {
            name: 'Nhà hàng Đối tác',
            address: 'Địa chỉ lấy hàng',
          };
        }

        // Driver earnings: standard 25,000 VND base fee + 10% of order total, rounded to thousands
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
          pickup_name: restaurantInfo.name,
          pickup_address: restaurantInfo.address,
          dropoff_address: order.delivery_address || 'Địa chỉ khách hàng',
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

    return trips;
  }
}
