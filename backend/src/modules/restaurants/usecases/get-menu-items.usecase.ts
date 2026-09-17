import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';

export interface GetMenuItemsQuery {
  restaurantId: string;
}

@Injectable()
export class GetMenuItemsUseCase {
  constructor(
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(query: GetMenuItemsQuery): Promise<MenuItem[]> {
    const restaurant = await this.restaurantReadRepo.findById(query.restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${query.restaurantId} not found`);
    }

    const cacheKey = `restaurant:${query.restaurantId}:menu`;
    const cachedMenu = await this.cacheManager.get<MenuItem[]>(cacheKey);

    if (cachedMenu) {
      return cachedMenu;
    }

    const menuItems = await this.restaurantReadRepo.findMenuItems(query.restaurantId);
    await this.cacheManager.set(cacheKey, menuItems, 60000); 
    
    return menuItems;
  }
}
