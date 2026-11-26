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

export interface MenuItemOptionChoice {
  id: string;
  name: string;
  price: number;
  is_default?: boolean;
}

export interface MenuItemOptionGroup {
  id: string;
  name: string;
  required: boolean;
  min_choices?: number;
  max_choices?: number;
  choices: MenuItemOptionChoice[];
}

export interface MenuItemData {
  id: string;
  restaurant_id: string;
  category_id?: string;
  category?: CategoryItem;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  original_price?: number;
  options?: MenuItemOptionGroup[];
  is_available: boolean;
  tags?: TagItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedRestaurantFallbackItem {
  id: string;
  name: string;
  address?: string;
  banner_url?: string;
  rating?: number;
  lat?: number;
  lon?: number;
}

export interface PaginatedRestaurantFallbackResponse {
  items: PaginatedRestaurantFallbackItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

@Injectable()
export class SearchReadRepository {
  private readonly logger = new Logger(SearchReadRepository.name);

  private getRestaurantServiceUrl(): string {
    const raw = process.env.RESTAURANT_SERVICE_URL?.trim();
    if (!raw) {
      throw new Error('[ConfigError] RESTAURANT_SERVICE_URL environment variable is required.');
    }
    return raw.replace(/\/+$/, '');
  }

  async getCategories(): Promise<CategoryItem[]> {
    try {
      const r = await fetch(`${this.getRestaurantServiceUrl()}/internal/restaurants/categories`);
      if (!r.ok) {
        this.logger.warn(`Categories fetch returned status ${r.status}`);
        return [];
      }
      const data: unknown = await r.json();
      return Array.isArray(data) ? (data as CategoryItem[]) : [];
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch categories from restaurant-service:', error);
      return [];
    }
  }

  async getTags(): Promise<TagItem[]> {
    try {
      const r = await fetch(`${this.getRestaurantServiceUrl()}/internal/restaurants/tags`);
      if (!r.ok) {
        this.logger.warn(`Tags fetch returned status ${r.status}`);
        return [];
      }
      const data: unknown = await r.json();
      return Array.isArray(data) ? (data as TagItem[]) : [];
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch tags from restaurant-service:', error);
      return [];
    }
  }

  async getMenuItemsForRestaurants(
    restaurantIds: string[],
    params: { q?: string; tags?: string[]; categories?: string[] },
  ): Promise<MenuItemData[]> {
    if (!restaurantIds || restaurantIds.length === 0) {
      return [];
    }
    const q = new URLSearchParams();
    q.set('restaurantIds', restaurantIds.join(','));
    if (params.q) q.set('q', params.q);
    if (params.tags && params.tags.length > 0) q.set('tags', params.tags.join(','));
    if (params.categories && params.categories.length > 0) {
      q.set('categories', params.categories.join(','));
    }

    try {
      const r = await fetch(
        `${this.getRestaurantServiceUrl()}/internal/restaurants/menu-items?${q.toString()}`,
      );
      if (!r.ok) {
        this.logger.warn(`Menu items fetch returned status ${r.status}`);
        return [];
      }
      const data: unknown = await r.json();
      return Array.isArray(data) ? (data as MenuItemData[]) : [];
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch menu items from restaurant-service:', error);
      return [];
    }
  }

  async getPaginatedRestaurantsFallback(params: {
    page: number;
    limit: number;
    categoryId?: string;
    q?: string;
    promoOnly?: boolean;
  }): Promise<PaginatedRestaurantFallbackResponse> {
    const query = new URLSearchParams();
    query.set('page', String(params.page));
    query.set('limit', String(params.limit));
    if (params.categoryId) query.set('categoryId', params.categoryId);
    if (params.q) query.set('q', params.q);
    if (params.promoOnly) query.set('promoOnly', 'true');

    try {
      const r = await fetch(
        `${this.getRestaurantServiceUrl()}/restaurants/paginated?${query.toString()}`,
      );
      if (!r.ok) {
        this.logger.warn(`Fallback paginated restaurants returned status ${r.status}`);
        return {
          items: [],
          pagination: {
            page: params.page,
            limit: params.limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      }
      const data = (await r.json()) as PaginatedRestaurantFallbackResponse;
      return data;
    } catch (error: unknown) {
      this.logger.warn('Failed to fetch paginated restaurants fallback:', error);
      return {
        items: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  async getFreeshipDistanceThreshold(): Promise<number> {
    try {
      const r = await fetch(
        `${this.getRestaurantServiceUrl()}/internal/restaurants/configs/freeship`,
      );
      if (!r.ok) {
        this.logger.warn(`Freeship threshold fetch returned status ${r.status}`);
        return 2;
      }
      const data: unknown = await r.json();
      const num = Number(data);
      return Number.isNaN(num) ? 2 : num;
    } catch (error: unknown) {
      this.logger.warn(
        'Failed to fetch freeship distance threshold from restaurant-service:',
        error,
      );
      return 2;
    }
  }
}
