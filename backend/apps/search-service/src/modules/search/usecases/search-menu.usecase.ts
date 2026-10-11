import { Injectable, Inject } from '@nestjs/common';
import { SearchRestaurantsUseCase, SearchRestaurantsQuery } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { SearchReadRepository, MenuItemData } from '@/modules/search/repositories/search.read.repository.js';

export interface RestaurantHit {
  id: string;
  name: string;
  rating?: number;
  lat?: number;
  lon?: number;
}

export interface MenuItemWithRestaurant extends MenuItemData {
  restaurant_name: string;
}

export interface MenuSectionResult {
  restaurant: string;
  items: MenuItemWithRestaurant[];
}

@Injectable()
export class SearchMenuUseCase {
  constructor(
    @Inject(SearchRestaurantsUseCase)
    private readonly searchRestaurantsUseCase: SearchRestaurantsUseCase,
    @Inject(SearchReadRepository)
    private readonly searchReadRepo: SearchReadRepository
  ) {}

  async execute(query: SearchRestaurantsQuery): Promise<MenuSectionResult[]> {
    const rawRestaurants = await this.searchRestaurantsUseCase.execute(query);
    const restaurants = (rawRestaurants || []) as RestaurantHit[];

    if (restaurants.length === 0) {
      return [];
    }

    const restaurantIds = restaurants.map((r) => r.id);
    const menuItems = await this.searchReadRepo.getMenuItemsForRestaurants(restaurantIds, query);

    const result: MenuSectionResult[] = restaurants
      .map((restaurant) => {
        const itemsForRestaurant = menuItems.filter((item) => item.restaurant_id === restaurant.id);
        return {
          restaurant: restaurant.name,
          items: itemsForRestaurant.map((item) => ({
            ...item,
            restaurant_name: restaurant.name,
          })),
        };
      })
      .filter((r) => r.items.length > 0);

    return result;
  }
}

