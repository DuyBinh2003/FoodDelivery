import { Injectable, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';

export interface DriverReviewItemDto {
  id: string;
  order_id: string;
  driver_rating: number;
  comment: string | null;
  image_urls: string[] | null;
  created_at: Date;
  delivery_address: string;
}

export interface DriverReviewsResponseDto {
  average_rating: number;
  total_reviews: number;
  star_counts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  reviews: DriverReviewItemDto[];
}

@Injectable()
export class GetDriverReviewsUseCase {
  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(params: { driverId: string }): Promise<DriverReviewsResponseDto> {
    const orders = await this.orderReadRepo.findTripsByDriverId(params.driverId);

    const reviews: DriverReviewItemDto[] = [];
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;

    for (const order of orders) {
      if (order.review && typeof order.review.driver_rating === 'number') {
        const rating = Math.min(5, Math.max(1, order.review.driver_rating));
        starCounts[rating as keyof typeof starCounts] =
          (starCounts[rating as keyof typeof starCounts] || 0) + 1;
        ratingSum += rating;

        reviews.push({
          id: order.review.id,
          order_id: order.id,
          driver_rating: rating,
          comment: order.review.comment,
          image_urls: order.review.image_urls || [],
          created_at: order.review.created_at,
          delivery_address: order.delivery_address || '',
        });
      }
    }

    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 5.0;

    return {
      average_rating: averageRating,
      total_reviews: totalReviews,
      star_counts: starCounts,
      reviews,
    };
  }
}
