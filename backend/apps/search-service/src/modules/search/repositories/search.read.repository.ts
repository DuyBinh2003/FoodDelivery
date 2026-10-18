import { Injectable, Logger } from '@nestjs/common';

export interface CategoryItem {
  id: string;
  name: string;
  icon_url?: string;
}

export interface TagItem {
  id: string;
  name: string;
}

export interface MenuItemData {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  is_available: boolean;
  tags?: TagItem[];
  created_at?: string;
  updated_at?: string;
}

@Injectable()
export class SearchReadRepository {
  private readonly logger = new Logger(SearchReadRepository.name);
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL!;

  constructor() {}

  async getCategories(): Promise<CategoryItem[]> {
    return fetch(`${this.restaurantUrl}/internal/restaurants/categories`)
      .then(async (r) => {
        if (!r.ok) {
          this.logger.warn(`Categories fetch returned status ${r.status}`);
          return [];
        }
        const data = await r.json();
        return Array.isArray(data) ? (data as CategoryItem[]) : [];
      })
      .catch((err) => {
        this.logger.warn('Failed to fetch categories from restaurant-service:', err);
        return [];
      });
  }

  async getTags(): Promise<TagItem[]> {
    return fetch(`${this.restaurantUrl}/internal/restaurants/tags`)
      .then(async (r) => {
        if (!r.ok) {
          this.logger.warn(`Tags fetch returned status ${r.status}`);
          return [];
        }
        const data = await r.json();
        return Array.isArray(data) ? (data as TagItem[]) : [];
      })
      .catch((err) => {
        this.logger.warn('Failed to fetch tags from restaurant-service:', err);
        return [];
      });
  }

  async getMenuItemsForRestaurants(
    restaurantIds: string[],
    params: { q?: string; tags?: string[] },
  ): Promise<MenuItemData[]> {
    if (!restaurantIds || restaurantIds.length === 0) {
      return [];
    }
    const q = new URLSearchParams();
    q.set('restaurantIds', restaurantIds.join(','));
    if (params.q) q.set('q', params.q);
    if (params.tags && params.tags.length > 0) q.set('tags', params.tags.join(','));

    return fetch(`${this.restaurantUrl}/internal/restaurants/menu-items?${q.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          this.logger.warn(`Menu items fetch returned status ${r.status}`);
          return [];
        }
        const data = await r.json();
        return Array.isArray(data) ? (data as MenuItemData[]) : [];
      })
      .catch((err) => {
        this.logger.warn('Failed to fetch menu items from restaurant-service:', err);
        return [];
      });
  }

  async getFreeshipDistanceThreshold(): Promise<number> {
    return fetch(`${this.restaurantUrl}/internal/restaurants/configs/freeship`)
      .then(async (r) => {
        if (!r.ok) {
          this.logger.warn(`Freeship threshold fetch returned status ${r.status}`);
          return 2;
        }
        const data = await r.json();
        const num = Number(data);
        return isNaN(num) ? 2 : num;
      })
      .catch((err) => {
        this.logger.warn('Failed to fetch freeship distance threshold from restaurant-service:', err);
        return 2;
      });
  }
}
