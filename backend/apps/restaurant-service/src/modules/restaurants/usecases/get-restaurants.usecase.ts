import { Injectable, Inject } from '@nestjs/common';
import {
  RestaurantReadRepository,
  type RestaurantWithPromoMeta,
} from '@/modules/restaurants/repositories/restaurant.read.repository.js';

@Injectable()
export class GetRestaurantsUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
  ) {}

  async execute(): Promise<RestaurantWithPromoMeta[]> {
    const restaurants = await this.restaurantReadRepo.findAll();
    if (restaurants.length === 0) {
      return [];
    }

    const promoMap =
      typeof this.restaurantReadRepo.getPromoStatsByRestaurantIds === 'function'
        ? await this.restaurantReadRepo.getPromoStatsByRestaurantIds(restaurants.map((r) => r.id))
        : new Map();

    return restaurants.map((restaurant) => {
      const stats = promoMap.get(restaurant.id) ?? {
        promo_item_count: 0,
        max_discount_percent: 0,
        has_promo: false,
      };
      return {
        ...restaurant,
        has_promo: stats.has_promo,
        max_discount_percent: stats.max_discount_percent,
        promo_item_count: stats.promo_item_count,
      };
    });
  }
}
