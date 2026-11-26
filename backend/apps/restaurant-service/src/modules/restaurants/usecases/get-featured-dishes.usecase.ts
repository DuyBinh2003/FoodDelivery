import { Injectable, Inject, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  RestaurantReadRepository,
  type FeaturedDishesParams,
  type PaginatedFeaturedDishesResult,
} from '@/modules/restaurants/repositories/restaurant.read.repository.js';

@Injectable()
export class GetFeaturedDishesUseCase {
  private readonly logger = new Logger(GetFeaturedDishesUseCase.name);

  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
  ) {}

  async execute(params: FeaturedDishesParams): Promise<PaginatedFeaturedDishesResult> {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(params.limit) || 12)));

    try {
      return await this.restaurantReadRepo.findFeaturedDishes({
        ...params,
        page,
        limit,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load featured dishes: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Không thể tải danh sách món ăn nổi bật', { cause: error });
    }
  }
}
