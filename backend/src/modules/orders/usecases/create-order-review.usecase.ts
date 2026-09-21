import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';
import { OrderWriteRepository } from '@/modules/orders/repositories/order.write.repository.js';
import { OrderReview } from '@/modules/orders/entities/order-review.entity.js';
import { CreateOrderReviewDto } from '@/modules/orders/dto/create-order-review.dto.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

@Injectable()
export class CreateOrderReviewUseCase {
  constructor(
    private readonly orderReadRepo: OrderReadRepository,
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

    const review = new OrderReview();
    review.order_id = params.orderId;
    review.restaurant_rating = params.dto.restaurant_rating as any;
    review.driver_rating = params.dto.driver_rating as any;
    review.food_rating = params.dto.food_rating as any;
    review.comment = params.dto.comment as any;
    review.image_urls = params.dto.image_urls as any;

    return this.orderWriteRepo.saveReview(review);
  }
}
