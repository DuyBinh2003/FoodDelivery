import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchReadRepository {
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';

  constructor() {}

  async getCategories() {
    return fetch(`${this.restaurantUrl}/internal/restaurants/categories`).then(r => r.json()).catch(() => []);
  }

  async getTags() {
    return fetch(`${this.restaurantUrl}/internal/restaurants/tags`).then(r => r.json()).catch(() => []);
  }

  async getMenuItemsForRestaurants(restaurantIds: string[], params: any) {
    if (!restaurantIds || restaurantIds.length === 0) {
      return [];
    }
    const q = new URLSearchParams();
    q.set('restaurantIds', restaurantIds.join(','));
    if (params.q) q.set('q', params.q);
    if (params.tags) q.set('tags', params.tags.join(','));
    
    return fetch(`${this.restaurantUrl}/internal/restaurants/menu-items?${q.toString()}`).then(r => r.json()).catch(() => []);
  }

  async getFreeshipDistanceThreshold(): Promise<number> {
    return fetch(`${this.restaurantUrl}/internal/restaurants/configs/freeship`).then(r => r.json()).catch(() => 2);
  }
}
