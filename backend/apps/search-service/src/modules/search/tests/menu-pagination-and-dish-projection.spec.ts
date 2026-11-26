/**
 * @file menu-pagination-and-dish-projection.spec.ts
 * @description Kiểm thử 3 nhánh cho ES Collapse Pagination, Rich Dish Projection, Category/Tag Filter & Circuit Breaker trên /search/menu/paginated
 * @trace docs/features/customer/menu-search.md
 * @plan docs/plans/customer/homepage-menu-lazyload-and-dish-fix.md # Verification Plan
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  ElasticsearchRepository,
  type MenuItemDocument,
  type RestaurantDocument,
} from '@/modules/search/repositories/elasticsearch.repository.js';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';
import { SearchController } from '@/modules/search/search.controller.js';
import type { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';
import type { SearchRestaurantsUseCase } from '@/modules/search/usecases/search-restaurants.usecase.js';
import type { SuggestSearchUseCase } from '@/modules/search/usecases/suggest-search.usecase.js';
import type { GetCategoriesUseCase } from '@/modules/search/usecases/get-categories.usecase.js';
import type { GetTagsUseCase } from '@/modules/search/usecases/get-tags.usecase.js';
import type { SyncRestaurantIndexUseCase } from '@/modules/search/usecases/sync-restaurant-index.usecase.js';

describe('Menu Pagination & Dish Projection Suite (3-Branch Testing)', () => {
  let mockEsService: {
    indices: {
      exists: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      getSettings: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    search: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    index: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  let mockSearchReadRepo: {
    getMenuItemsForRestaurants: ReturnType<typeof vi.fn>;
    getPaginatedRestaurantsFallback: ReturnType<typeof vi.fn>;
    getCategories: ReturnType<typeof vi.fn>;
    getTags: ReturnType<typeof vi.fn>;
    getFreeshipDistanceThreshold: ReturnType<typeof vi.fn>;
  };

  let repo: ElasticsearchRepository;
  let searchMenuUseCase: SearchMenuUseCase;
  let searchController: SearchController;

  const rest1Id = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const catPhoId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const tagHotId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25';

  const richMenuItem: MenuItemDocument = {
    id: 'dish-es-1',
    restaurant_id: rest1Id,
    restaurant_name: 'Phở Biển',
    restaurant_banner_url: 'http://localhost:4566/food-delivery-assets/defaults/banners/restaurant-banner-pho.svg',
    restaurant_address: '123 Lê Lợi, Q1',
    restaurant_total_reviews: 42,
    category_id: catPhoId,
    category_name: 'Phở',
    name: 'Phở Tái Lăn Đá',
    description: 'Thịt bò xào thơm ngậy',
    image_url: 'http://localhost:4566/food-delivery-assets/defaults/dishes/dish-pho.svg',
    price: 52000,
    original_price: 65000,
    options: [
      {
        id: 'opt-size',
        name: 'Kích cỡ',
        required: true,
        choices: [{ id: 'ch-l', name: 'Tô Đặc Biệt', price: 15000 }],
      },
    ],
    is_available: true,
    tags: ['Bán Chạy'],
    tag_ids: [tagHotId],
    location: { lat: 10.7725, lon: 106.7027 },
    rating: 4.85,
  };

  const richRestaurant: RestaurantDocument = {
    id: rest1Id,
    name: 'Phở Biển',
    address: '123 Lê Lợi, Q1',
    banner_url: 'http://localhost:4566/food-delivery-assets/defaults/banners/restaurant-banner-pho.svg',
    rating: 4.85,
    total_reviews: 42,
    location: { lat: 10.7725, lon: 106.7027 },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEsService = {
      indices: {
        exists: vi.fn().mockResolvedValue(true),
        create: vi.fn().mockResolvedValue({ acknowledged: true }),
        getSettings: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({ acknowledged: true }),
      },
      search: vi.fn(),
      count: vi.fn().mockResolvedValue({ count: 10 }),
      index: vi.fn().mockResolvedValue({ result: 'created' }),
      update: vi.fn().mockResolvedValue({ result: 'updated' }),
      delete: vi.fn().mockResolvedValue({ result: 'deleted' }),
    };

    mockSearchReadRepo = {
      getMenuItemsForRestaurants: vi.fn().mockResolvedValue([]),
      getPaginatedRestaurantsFallback: vi.fn().mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 8, total: 0, totalPages: 0, hasMore: false },
      }),
      getCategories: vi.fn().mockResolvedValue([]),
      getTags: vi.fn().mockResolvedValue([]),
      getFreeshipDistanceThreshold: vi.fn().mockResolvedValue(2),
    };

    repo = new ElasticsearchRepository(mockEsService as unknown as ElasticsearchService);
    searchMenuUseCase = new SearchMenuUseCase(
      repo,
      mockSearchReadRepo as unknown as SearchReadRepository,
    );
    searchController = new SearchController(
      searchMenuUseCase,
      {} as SearchRestaurantsUseCase,
      {} as SuggestSearchUseCase,
      {} as GetCategoriesUseCase,
      {} as GetTagsUseCase,
      {} as SyncRestaurantIndexUseCase,
      repo,
    );
  });

  // ==========================================
  // 1. HAPPY PATH
  // ==========================================
  describe('Happy Path', () => {
    it('should execute section-aware collapse pagination and return complete dish & real restaurant metadata', async () => {
      mockEsService.search
        // Step 1: Collapse query by restaurant_id
        .mockResolvedValueOnce({
          hits: {
            total: { value: 1644 },
            hits: [{ _id: 'dish-es-1', _source: { restaurant_id: rest1Id } }],
          },
          aggregations: {
            total_restaurants: { value: 150 },
          },
        })
        // Step 2a: All items belonging to page restaurant IDs
        .mockResolvedValueOnce({
          hits: {
            hits: [{ _id: 'dish-es-1', _source: richMenuItem }],
          },
        })
        // Step 2b: Restaurant docs metadata
        .mockResolvedValueOnce({
          hits: {
            hits: [{ _id: rest1Id, _source: richRestaurant }],
          },
        });

      const result = await searchMenuUseCase.executePaginated({
        page: 1,
        limit: 8,
        categories: [catPhoId],
        tags: [tagHotId],
        lat: 10.7725,
        lon: 106.7027,
      });

      expect(mockEsService.search).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          index: 'menu_items',
          collapse: { field: 'restaurant_id' },
          from: 0,
          size: 8,
        }),
      );

      expect(result.isFallback).toBe(false);
      expect(result.circuitStatus).toBe('CLOSED');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 8,
        totalRestaurants: 150,
        totalDishes: 1644,
        totalPages: 19,
        hasMore: true,
      });

      expect(result.sections).toHaveLength(1);
      const sec = result.sections[0];
      expect(sec.restaurant).toBe('Phở Biển');
      expect(sec.restaurant_id).toBe(rest1Id);
      expect(sec.restaurant_rating).toBe(4.85);
      expect(sec.restaurant_total_reviews).toBe(42);
      expect(sec.restaurant_banner_url).toContain('restaurant-banner-pho.svg');
      expect(sec.distance_km).toBe(0);

      const dish = sec.items[0];
      expect(dish.image_url).toContain('dish-pho.svg');
      expect(dish.price).toBe(52000);
      expect(dish.original_price).toBe(65000);
      expect(dish.options).toHaveLength(1);
      expect(dish.category).toEqual({ id: catPhoId, name: 'Phở' });
      expect(dish.tags).toEqual([{ id: tagHotId, name: 'Bán Chạy' }]);
    });

    it('should normalize singular category/tag query parameters and support legacy banner slugs', async () => {
      mockEsService.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: { total_restaurants: { value: 0 } },
      });

      await searchController.searchMenuPaginated({
        category: 'tra-sua',
        tag: tagHotId,
        page: 1,
        limit: 8,
      });

      const callArg = mockEsService.search.mock.calls[0]?.[0] as {
        query?: { bool?: { filter?: Array<Record<string, unknown>> } };
      };
      const filtersJson = JSON.stringify(callArg.query?.bool?.filter ?? []);
      expect(filtersJson).toContain('Trà Sữa');
      expect(filtersJson).toContain(tagHotId);
    });
  });

  // ==========================================
  // 2. EDGE CASES
  // ==========================================
  describe('Edge Cases', () => {
    it('should return empty pagination result with hasMore = false when collapse matches zero restaurants', async () => {
      mockEsService.search.mockResolvedValueOnce({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: { total_restaurants: { value: 0 } },
      });

      const res = await searchMenuUseCase.executePaginated({ q: 'non-existing-food', page: 3, limit: 8 });

      expect(mockEsService.search).toHaveBeenCalledTimes(1);
      expect(res.sections).toEqual([]);
      expect(res.pagination).toEqual({
        page: 3,
        limit: 8,
        totalRestaurants: 0,
        totalDishes: 0,
        totalPages: 0,
        hasMore: false,
      });
    });

    it('should fall back cleanly to SearchReadRepository with full dish fields when ES fails', async () => {
      mockEsService.search.mockRejectedValueOnce(new Error('ES Cluster Timeout'));
      mockSearchReadRepo.getPaginatedRestaurantsFallback.mockResolvedValueOnce({
        items: [
          {
            id: rest1Id,
            name: 'Phở Biển',
            address: '123 Lê Lợi, Q1',
            banner_url: richRestaurant.banner_url,
            rating: 4.85,
            lat: 10.7725,
            lon: 106.7027,
          },
        ],
        pagination: { page: 1, limit: 8, total: 1, totalPages: 1, hasMore: false },
      });
      mockSearchReadRepo.getMenuItemsForRestaurants.mockResolvedValueOnce([
        {
          id: 'dish-db-1',
          restaurant_id: rest1Id,
          name: 'Phở Đặc Biệt DB',
          image_url: richMenuItem.image_url,
          price: 55000,
          original_price: 70000,
          options: richMenuItem.options,
          is_available: true,
          tags: [{ id: tagHotId, name: 'Bán Chạy' }],
        },
      ]);

      const res = await searchMenuUseCase.executePaginated({ page: 1, limit: 8 });

      expect(res.isFallback).toBe(true);
      expect(res.circuitStatus).toBe('DEGRADED');
      expect(res.sections).toHaveLength(1);
      expect(res.sections[0].items[0].image_url).toBe(richMenuItem.image_url);
      expect(res.sections[0].items[0].original_price).toBe(70000);
      expect(res.sections[0].items[0].options).toHaveLength(1);
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('should trigger PaginatedMenuCatalogBreaker OPEN response safely when useCase throws repeatedly', async () => {
      const executePaginatedSpy = vi
        .spyOn(searchMenuUseCase, 'executePaginated')
        .mockRejectedValue(new Error('Complete downstream outage'));

      let lastResult: Awaited<ReturnType<SearchController['searchMenuPaginated']>> | null = null;
      for (let i = 0; i < 6; i++) {
        lastResult = await searchController.searchMenuPaginated({ page: 1, limit: 8 });
      }

      expect(executePaginatedSpy).toHaveBeenCalled();
      expect(lastResult).toBeDefined();
      expect((lastResult as { isFallback: boolean }).isFallback).toBe(true);
      expect((lastResult as { circuitStatus: string }).circuitStatus).toBe('OPEN');
      expect(Array.isArray((lastResult as { sections: unknown[] }).sections)).toBe(true);
    });
  });
});
