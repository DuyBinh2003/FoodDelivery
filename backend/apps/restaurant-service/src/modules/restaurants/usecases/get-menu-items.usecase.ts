import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { CacheStampedeService } from '@/common/cache/cache-stampede.service.js';

export interface GetMenuItemsQuery {
  restaurantId: string;
}

@Injectable()
export class GetMenuItemsUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(CacheStampedeService)
    private readonly cacheStampedeService: CacheStampedeService,
  ) {}

  async execute(query: GetMenuItemsQuery): Promise<MenuItem[]> {
    const restaurant = await this.restaurantReadRepo.findById(query.restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${query.restaurantId} not found`);
    }

    const cacheKey = `restaurant:${query.restaurantId}:menu`;
    return this.cacheStampedeService.getOrSet<MenuItem[]>(
      cacheKey,
      async () => {
        return this.restaurantReadRepo.findMenuItems(query.restaurantId);
      },
      { ttlSeconds: 60, beta: 1.0 },
    );
  }
}
