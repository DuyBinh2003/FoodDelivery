/**
 * @file restaurant-discovery-feed.spec.ts
 * @description Kiểm thử 3 nhánh cho API phân trang nhà hàng (/restaurants/paginated) và món ăn nổi bật (/restaurants/featured-dishes)
 * @trace docs/features/customer/restaurant-discovery.md
 * @plan docs/plans/customer/homepage-menu-lazyload-and-dish-fix.md # Verification Plan
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import { GetPaginatedRestaurantsUseCase } from '@/modules/restaurants/usecases/get-paginated-restaurants.usecase.js';
import { GetFeaturedDishesUseCase } from '@/modules/restaurants/usecases/get-featured-dishes.usecase.js';
import type {
  RestaurantReadRepository,
  PaginatedRestaurantsResult,
  PaginatedFeaturedDishesResult,
} from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import type { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';

describe('Restaurant Discovery & Featured Dishes Suite (3-Branch Testing)', () => {
  let mockReadRepo: Pick<
    RestaurantReadRepository,
    'findPaginated' | 'findFeaturedDishes'
  >;
  let getPaginatedUseCase: GetPaginatedRestaurantsUseCase;
  let getFeaturedDishesUseCase: GetFeaturedDishesUseCase;

  const mockRestaurantEntity: Restaurant = {
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    name: 'Phở Biển Gourmet',
    address: '120 Nguyễn Huệ, Quận 1, TP.HCM',
    is_active: true,
    verification_status: 'VERIFIED',
    lat: 10.7725,
    lon: 106.7027,
    rating: 4.85,
    banner_url: 'http://localhost:4566/food-delivery-assets/defaults/banners/restaurant-banner-pho.svg',
    categories: [
      {
        id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Phở',
        icon_url: '',
        created_at: new Date('2026-11-01T00:00:00Z'),
        updated_at: new Date('2026-11-01T00:00:00Z'),
        is_deleted: false,
      },
    ],
    created_at: new Date('2026-11-01T00:00:00Z'),
    updated_at: new Date('2026-11-01T00:00:00Z'),
    is_deleted: false,
  };

  beforeEach(() => {
    mockReadRepo = {
      findPaginated: vi.fn(),
      findFeaturedDishes: vi.fn(),
    };
    getPaginatedUseCase = new GetPaginatedRestaurantsUseCase(
      mockReadRepo as unknown as RestaurantReadRepository,
    );
    getFeaturedDishesUseCase = new GetFeaturedDishesUseCase(
      mockReadRepo as unknown as RestaurantReadRepository,
    );
  });

  // ==========================================
  // 1. HAPPY PATH (Luồng chuẩn)
  // ==========================================
  describe('Happy Path', () => {
    it('should return paginated active restaurants with banner_url and real promo stats', async () => {
      const expected: PaginatedRestaurantsResult = {
        items: [
          {
            ...mockRestaurantEntity,
            has_promo: true,
            max_discount_percent: 25,
            promo_item_count: 3,
          },
        ],
        pagination: {
          page: 1,
          limit: 12,
          total: 150,
          totalPages: 13,
          hasMore: true,
        },
      };
      vi.mocked(mockReadRepo.findPaginated).mockResolvedValueOnce(expected);

      const res = await getPaginatedUseCase.execute({ page: 1, limit: 12 });

      expect(mockReadRepo.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 12 });
      expect(res.items).toHaveLength(1);
      expect(res.items[0].banner_url).toContain('restaurant-banner-pho.svg');
      expect(res.items[0].has_promo).toBe(true);
      expect(res.items[0].max_discount_percent).toBe(25);
      expect(res.pagination.hasMore).toBe(true);
      expect(res.pagination.total).toBe(150);
    });

    it('should return featured dishes with full metadata (image_url, original_price, options, tags)', async () => {
      const expected: PaginatedFeaturedDishesResult = {
        items: [
          {
            id: 'dish-1',
            restaurant_id: mockRestaurantEntity.id,
            restaurant_name: 'Phở Biển Gourmet',
            restaurant_banner_url: mockRestaurantEntity.banner_url,
            restaurant_rating: 4.85,
            category_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            category: { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Phở' },
            name: 'Phở Bò Wagyu Đặc Biệt',
            description: 'Nước dùng ninh xương 18 tiếng',
            image_url: 'http://localhost:4566/food-delivery-assets/defaults/dishes/dish-pho.svg',
            price: 68000,
            original_price: 85000,
            discount_percent: 20,
            options: [
              {
                id: 'opt-size',
                name: 'Kích cỡ',
                required: true,
                choices: [{ id: 'size-l', name: 'Tô Lớn', price: 10000 }],
              },
            ],
            is_available: true,
            tags: [{ id: 'tag-1', name: 'Bán Chạy' }],
          },
        ],
        pagination: {
          page: 1,
          limit: 12,
          total: 1644,
          totalPages: 137,
          hasMore: true,
        },
      };
      vi.mocked(mockReadRepo.findFeaturedDishes).mockResolvedValueOnce(expected);

      const res = await getFeaturedDishesUseCase.execute({ page: 1, limit: 12 });

      expect(res.items).toHaveLength(1);
      expect(res.items[0].image_url).toContain('dish-pho.svg');
      expect(res.items[0].original_price).toBe(85000);
      expect(res.items[0].discount_percent).toBe(20);
      expect(res.items[0].options).toHaveLength(1);
      expect(res.items[0].tags[0].name).toBe('Bán Chạy');
    });
  });

  // ==========================================
  // 2. EDGE CASES (Trường hợp biên / Giới hạn)
  // ==========================================
  describe('Edge Cases', () => {
    it('should clamp out-of-range page and limit parameters safely and handle empty page', async () => {
      vi.mocked(mockReadRepo.findPaginated).mockResolvedValueOnce({
        items: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 10,
          totalPages: 1,
          hasMore: false,
        },
      });

      const res = await getPaginatedUseCase.execute({ page: -3, limit: 999 });

      expect(mockReadRepo.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 50 });
      expect(res.items).toEqual([]);
      expect(res.pagination.hasMore).toBe(false);
    });

    it('should handle featured dishes without discount (discount_percent = 0) and empty options', async () => {
      vi.mocked(mockReadRepo.findFeaturedDishes).mockResolvedValueOnce({
        items: [
          {
            id: 'dish-plain',
            restaurant_id: mockRestaurantEntity.id,
            restaurant_name: 'Phở Biển Gourmet',
            restaurant_rating: 0,
            name: 'Quẩy Nóng Giòn',
            price: 10000,
            discount_percent: 0,
            options: [],
            is_available: true,
            tags: [],
          },
        ],
        pagination: {
          page: 2,
          limit: 12,
          total: 13,
          totalPages: 2,
          hasMore: false,
        },
      });

      const res = await getFeaturedDishesUseCase.execute({ page: 2, limit: 12 });

      expect(res.items[0].discount_percent).toBe(0);
      expect(res.items[0].original_price).toBeUndefined();
      expect(res.items[0].options).toEqual([]);
      expect(res.pagination.hasMore).toBe(false);
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (Bắt lỗi chuẩn)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('should wrap database query error in InternalServerErrorException with root cause on paginated restaurants', async () => {
      const dbError = new Error('Connection terminated unexpectedly');
      vi.mocked(mockReadRepo.findPaginated).mockRejectedValueOnce(dbError);

      await expect(getPaginatedUseCase.execute({ page: 1, limit: 12 })).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should wrap database query error in InternalServerErrorException with root cause on featured dishes', async () => {
      const dbError = new Error('Query timeout on m_menu_item');
      vi.mocked(mockReadRepo.findFeaturedDishes).mockRejectedValueOnce(dbError);

      await expect(getFeaturedDishesUseCase.execute({ page: 1, limit: 12 })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
