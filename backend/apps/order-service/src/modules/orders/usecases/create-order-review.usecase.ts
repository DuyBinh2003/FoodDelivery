import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { OrderReview } from '@/modules/orders/entities/order-review.entity.js';
import { CreateOrderReviewDto } from '@/modules/orders/dto/create-order-review.dto.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class CreateOrderReviewUseCase {
  private readonly logger = new Logger(CreateOrderReviewUseCase.name);

  constructor(
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
    @Inject(OrderWriteRepository)
    private readonly orderWriteRepo: OrderWriteRepository,
  ) {}

  async execute(params: {
    orderId: string;
    customerId: string;
    dto: CreateOrderReviewDto;
  }): Promise<OrderReview> {
    const order = await this.orderReadRepo.findById(params.orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customer_id !== params.customerId) {
      throw new BadRequestException('You do not have permission to review this order');
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed orders');
    }

    if (order.review) {
      throw new BadRequestException('This order has already been reviewed');
    }

    const { restaurant_rating, driver_rating, food_rating, comment, image_urls } = params.dto;

    if (restaurant_rating == null && driver_rating == null && food_rating == null) {
      throw new BadRequestException('At least one rating (restaurant, driver, or food) is required');
    }

    const review = new OrderReview();
    review.order_id = params.orderId;
    if (restaurant_rating != null) review.restaurant_rating = restaurant_rating;
    if (driver_rating != null) review.driver_rating = driver_rating;
    if (food_rating != null) review.food_rating = food_rating;
    review.comment = comment || '';
    review.image_urls = image_urls || [];

    const savedReview = await this.orderWriteRepo.saveReview(review);

    // If restaurant was rated, calculate new average and sync to restaurant-service & search-service
    if (restaurant_rating != null && order.restaurant_id) {
      try {
        const stats = await this.orderReadRepo.calculateRestaurantRatingStats(order.restaurant_id);
        await this.syncRestaurantRating(order.restaurant_id, stats.average_rating);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Failed to sync restaurant rating after review: ${msg}`);
      }
    }

    return savedReview;
  }

  private async syncRestaurantRating(restaurantId: string, newRating: number): Promise<void> {
    const restaurantServiceUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';
    const searchServiceUrl = process.env.SEARCH_SERVICE_URL || 'http://localhost:3006';

    // 1. Sync to restaurant-service
    try {
      await fetch(`${restaurantServiceUrl}/internal/restaurants/${restaurantId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Could not reach restaurant-service to update rating: ${msg}`);
    }

    // 2. Sync to search-service (Elasticsearch)
    try {
      await fetch(`${searchServiceUrl}/internal/search/restaurants/${restaurantId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newRating }),
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Could not reach search-service to update elasticsearch rating: ${msg}`);
    }
  }
}
