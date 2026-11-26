import { Injectable, Inject, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  RestaurantReadRepository,
  type PaginatedRestaurantsParams,
  type PaginatedRestaurantsResult,
} from '@/modules/restaurants/repositories/restaurant.read.repository.js';

@Injectable()
export class GetPaginatedRestaurantsUseCase {
  private readonly logger = new Logger(GetPaginatedRestaurantsUseCase.name);

  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
  ) {}

  async execute(params: PaginatedRestaurantsParams): Promise<PaginatedRestaurantsResult> {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(params.limit) || 12)));

    try {
      return await this.restaurantReadRepo.findPaginated({
        ...params,
        page,
        limit,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load paginated restaurants: ${msg}`, error instanceof Error ? error.stack : undefined);
      throw new InternalServerErrorException('Không thể tải danh sách nhà hàng phân trang', { cause: error });
    }
  }
}
