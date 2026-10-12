import { Injectable, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';

export interface DriverSummaryDto {
  total_trips: number;
  completed_trips: number;
  total_earnings: number;
  today_trips: number;
  today_earnings: number;
  average_rating: number;
  total_reviews: number;
}

@Injectable()
export class GetDriverSummaryUseCase {
  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(params: { driverId: string }): Promise<DriverSummaryDto> {
    const orders = await this.orderReadRepo.findTripsByDriverId(params.driverId);

    const now = new Date();
    const isToday = (d: Date) => {
      const date = new Date(d);
      return (
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    };

    let totalEarnings = 0;
    let todayEarnings = 0;
    let todayTrips = 0;
    let completedTrips = 0;
    let ratingSum = 0;
    let totalReviews = 0;

    for (const order of orders) {
      const isCompleted = order.status === 'COMPLETED';
      if (isCompleted) {
        completedTrips++;
      }

      // Calculate earnings (only for non-cancelled trips)
      if (order.status !== 'CANCELLED') {
        const baseFee = 25000;
        const totalNum = Number(order.total_amount) || 0;
        const commission = Math.round((totalNum * 0.1) / 1000) * 1000;
        const tripEarnings = baseFee + commission;

        totalEarnings += tripEarnings;

        if (isToday(order.created_at)) {
          todayTrips++;
          todayEarnings += tripEarnings;
        }
      }

      if (order.review && order.review.driver_rating) {
        ratingSum += order.review.driver_rating;
        totalReviews++;
      }
    }

    const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 5.0;

    return {
      total_trips: orders.length,
      completed_trips: completedTrips,
      total_earnings: totalEarnings,
      today_trips: todayTrips,
      today_earnings: todayEarnings,
      average_rating: averageRating,
      total_reviews: totalReviews,
    };
  }
}
