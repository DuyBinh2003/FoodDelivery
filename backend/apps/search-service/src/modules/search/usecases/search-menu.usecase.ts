import { Injectable, Inject, Logger } from '@nestjs/common';
import { SearchRestaurantsQuery } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { ElasticsearchRepository, MenuItemDocument } from '@/modules/search/repositories/elasticsearch.repository.js';
import { SearchReadRepository, MenuItemData } from '@/modules/search/repositories/search.read.repository.js';

export interface MenuItemWithRestaurant extends Partial<MenuItemData> {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  tags?: any[];
}

export interface MenuSectionResult {
  restaurant: string;
  items: MenuItemWithRestaurant[];
}

@Injectable()
export class SearchMenuUseCase {
  private readonly logger = new Logger(SearchMenuUseCase.name);

  constructor(
    @Inject(ElasticsearchRepository)
    private readonly elasticsearchRepo: ElasticsearchRepository,
    @Inject(SearchReadRepository)
    private readonly searchReadRepo: SearchReadRepository,
  ) {}

  async execute(query: SearchRestaurantsQuery): Promise<MenuSectionResult[]> {
    try {
      // 1. Direct query on Elasticsearch 'menu_items' index
      const esMenuItems = await this.elasticsearchRepo.searchMenuItems(query);

      if (esMenuItems && esMenuItems.length > 0) {
        return this.groupMenuItemsByRestaurant(esMenuItems);
      }
    } catch (esError) {
      this.logger.warn('Direct Elasticsearch menu query failed or empty, falling back to read repository:', esError);
    }

    // 2. Fallback to 2-step search if ES menu_items has not yet populated
    const restaurants = await this.elasticsearchRepo.searchRestaurants(query);
    if (!restaurants || restaurants.length === 0) {
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

  private groupMenuItemsByRestaurant(menuItems: MenuItemDocument[]): MenuSectionResult[] {
    const map = new Map<string, MenuItemWithRestaurant[]>();

    for (const item of menuItems) {
      const restName = item.restaurant_name || 'Nhà hàng';
      const existing = map.get(restName) || [];
      existing.push({
        id: item.id,
        restaurant_id: item.restaurant_id,
        restaurant_name: restName,
        name: item.name,
        description: item.description,
        price: item.price,
        is_available: item.is_available,
        tags: item.tags ? item.tags.map((t) => ({ id: t, name: t })) : [],
      });
      map.set(restName, existing);
    }

    return Array.from(map.entries()).map(([restaurant, items]) => ({
      restaurant,
      items,
    }));
  }
}
