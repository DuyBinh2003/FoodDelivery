import { Injectable } from '@nestjs/common';
import { SearchRestaurantsUseCase, SearchRestaurantsQuery } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';

@Injectable()
export class SearchMenuUseCase {
  constructor(
    private readonly searchRestaurantsUseCase: SearchRestaurantsUseCase,
    private readonly searchReadRepo: SearchReadRepository
  ) {}

  async execute(query: SearchRestaurantsQuery) {
    const restaurants = await this.searchRestaurantsUseCase.execute(query) as any[];

    if (!restaurants || restaurants.length === 0) {
      return [];
    }

    const restaurantIds = restaurants.map(r => r.id);
    const menuItems = await this.searchReadRepo.getMenuItemsForRestaurants(restaurantIds, query);

    const result = restaurants.map(restaurant => {
      const itemsForRestaurant = menuItems.filter(item => item.restaurant_id === restaurant.id);
      return {
        restaurant: restaurant.name,
        items: itemsForRestaurant.map(item => ({
          ...item,
          restaurant_name: restaurant.name
        }))
      };
    }).filter(r => r.items.length > 0);

    return result;
  }
}
