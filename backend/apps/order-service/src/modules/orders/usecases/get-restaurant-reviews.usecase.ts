import { Injectable, Inject } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { RestaurantReviewsQueryDto } from '@/modules/orders/dto/restaurant-reviews-query.dto.js';
import { OrderReview } from '@/modules/orders/entities/order-review.entity.js';

export interface RestaurantReviewsResult {
  data: OrderReview[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  average_rating: number;
  star_breakdown: Record<number, number>;
}

@Injectable()
export class GetRestaurantReviewsUseCase {
  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
  ) {}

  async execute(
    restaurantId: string,
    query: RestaurantReviewsQueryDto,
  ): Promise<RestaurantReviewsResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.orderReadRepo.findRestaurantReviews(restaurantId, page, limit);
    const totalPages = Math.ceil(result.total / limit) || 1;

    return {
      data: result.data,
      total: result.total,
      page,
      limit,
      total_pages: totalPages,
      average_rating: result.average_rating,
      star_breakdown: result.star_breakdown,
    };
  }
}
