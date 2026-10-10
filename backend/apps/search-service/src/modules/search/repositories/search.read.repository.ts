import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchReadRepository {
  constructor() {}

  async getCategories() {
    return fetch('http://localhost:3002/internal/restaurants/categories').then(r => r.json()).catch(() => []);
  }

  async getTags() {
    return fetch('http://localhost:3002/internal/restaurants/tags').then(r => r.json()).catch(() => []);
  }

  async getMenuItemsForRestaurants(restaurantIds: string[], params: any) {
    if (!restaurantIds || restaurantIds.length === 0) {
      return [];
    }
    const q = new URLSearchParams();
    q.set('restaurantIds', restaurantIds.join(','));
    if (params.q) q.set('q', params.q);
    if (params.tags) q.set('tags', params.tags.join(','));
    
    return fetch('http://localhost:3002/internal/restaurants/menu-items?' + q.toString()).then(r => r.json()).catch(() => []);
  }

  async getFreeshipDistanceThreshold(): Promise<number> {
    return fetch('http://localhost:3002/internal/restaurants/configs/freeship').then(r => r.json()).catch(() => 2);
  }
}
