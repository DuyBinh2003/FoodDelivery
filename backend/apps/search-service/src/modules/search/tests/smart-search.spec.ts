/**
 * @file smart-search.spec.ts
 * @description Unit tests for Smart Food Search Engine (Dual Indexing, Vietnamese Analysis, Multi-Factor Ranking & Suggesters)
 * @traceability
 * - Issue: #87
 * - Plan: docs/plans/platform/smart-food-search-engine.md
 * - Target: backend/apps/search-service/src/modules/search/
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import { ElasticsearchRepository } from '@/modules/search/repositories/elasticsearch.repository.js';
import { SearchRestaurantsUseCase } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';
import { SuggestSearchUseCase } from '@/modules/search/usecases/suggest-search.usecase.js';

describe('Smart Food Search Engine Suite (3-Branch Testing)', () => {
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
    getCategories: ReturnType<typeof vi.fn>;
    getTags: ReturnType<typeof vi.fn>;
  };

  let repo: ElasticsearchRepository;
  let searchRestaurantsUseCase: SearchRestaurantsUseCase;
  let searchMenuUseCase: SearchMenuUseCase;
  let suggestSearchUseCase: SuggestSearchUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEsService = {
      indices: {
        exists: vi.fn().mockResolvedValue(true),
        create: vi.fn().mockResolvedValue({ acknowledged: true }),
        getSettings: vi.fn().mockResolvedValue({
          restaurants: {
            settings: {
              index: {
                analysis: {
                  analyzer: {
                    vi_analyzer: {},
                  },
                },
              },
            },
          },
        }),
        delete: vi.fn().mockResolvedValue({ acknowledged: true }),
      },
      search: vi.fn(),
      count: vi.fn().mockResolvedValue({ count: 5 }),
      index: vi.fn().mockResolvedValue({ result: 'created' }),
      update: vi.fn().mockResolvedValue({ result: 'updated' }),
      delete: vi.fn().mockResolvedValue({ result: 'deleted' }),
    };

    mockSearchReadRepo = {
      getMenuItemsForRestaurants: vi.fn().mockResolvedValue([]),
      getCategories: vi.fn().mockResolvedValue([]),
      getTags: vi.fn().mockResolvedValue([]),
    };

    repo = new ElasticsearchRepository(mockEsService as any);
    searchRestaurantsUseCase = new SearchRestaurantsUseCase(repo);
    searchMenuUseCase = new SearchMenuUseCase(repo, mockSearchReadRepo as any);
    suggestSearchUseCase = new SuggestSearchUseCase(repo);
  });

  // ==========================================
  // NHÁNH 1: HAPPY PATH (HP)
  // ==========================================
  describe('Nhánh 1: Happy Path (HP)', () => {
    it('HP-01: Tìm kiếm không dấu ("com tam") trả về chính xác nhà hàng có dấu ("Cơm Tấm Sài Gòn")', async () => {
      const mockHits = {
        hits: {
          hits: [
            {
              _id: 'rest-1',
              _score: 2.8,
              _source: {
                id: 'rest-1',
                name: 'Cơm Tấm Sài Gòn',
                rating: 4.8,
                location: { lat: 10.7725, lon: 106.7027 },
              },
            },
          ],
        },
      };
      mockEsService.search.mockResolvedValueOnce(mockHits);

      const result = await searchRestaurantsUseCase.execute({ q: 'com tam' });

      expect(mockEsService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'restaurants',
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                expect.objectContaining({
                  multi_match: expect.objectContaining({
                    query: 'com tam',
                    fuzziness: 'AUTO',
                  }),
                }),
              ]),
            }),
          }),
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Cơm Tấm Sài Gòn');
    });

    it('HP-02: Tìm kiếm tên món ("Trà sữa ô long") trả về danh sách món ăn từ index menu_items gom theo nhà hàng', async () => {
      const mockMenuHits = {
        hits: {
          hits: [
            {
              _id: 'menu-1',
              _source: {
                id: 'menu-1',
                restaurant_id: 'rest-1',
                restaurant_name: 'Tiệm Trà Cô Ba',
                name: 'Trà Sữa Ô Long',
                price: 35000,
                is_available: true,
                tags: ['Giải Khát'],
              },
            },
          ],
        },
      };
      mockEsService.search.mockResolvedValueOnce(mockMenuHits);

      const result = await searchMenuUseCase.execute({ q: 'Trà sữa ô long' });

      expect(mockEsService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'menu_items',
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].restaurant).toBe('Tiệm Trà Cô Ba');
      expect(result[0].items[0].name).toBe('Trà Sữa Ô Long');
      expect(result[0].items[0].price).toBe(35000);
    });

    it('HP-03: Gợi ý nhanh Autocomplete khi gõ "tra s" trả về danh sách keywords, dishes và restaurants', async () => {
      const mockRestHits = {
        hits: {
          hits: [
            {
              _id: 'rest-10',
              _source: {
                id: 'rest-10',
                name: 'Trà Sữa Gongcha',
                rating: 4.7,
                location: { lat: 10.77, lon: 106.7 },
              },
            },
          ],
        },
      };

      const mockMenuHits = {
        hits: {
          hits: [
            {
              _id: 'dish-10',
              _source: {
                id: 'dish-10',
                name: 'Trà Sen Vàng',
                price: 45000,
                restaurant_id: 'rest-10',
                restaurant_name: 'Trà Sữa Gongcha',
              },
            },
          ],
        },
      };

      mockEsService.search
        .mockResolvedValueOnce(mockRestHits)
        .mockResolvedValueOnce(mockMenuHits);

      const result = await suggestSearchUseCase.execute({
        q: 'tra s',
        lat: 10.77,
        lon: 106.7,
      });

      expect(result.keywords).toContain('Trà Sữa Gongcha');
      expect(result.keywords).toContain('Trà Sen Vàng');
      expect(result.dishes).toHaveLength(1);
      expect(result.dishes[0].name).toBe('Trà Sen Vàng');
      expect(result.restaurants).toHaveLength(1);
      expect(result.restaurants[0].name).toBe('Trà Sữa Gongcha');
    });

    it('HP-04: Xếp hạng Relevance Score: Áp dụng function_score kết hợp decay khoảng cách và rating khi có tọa độ', async () => {
      mockEsService.search.mockResolvedValueOnce({
        hits: { hits: [] },
      });

      await searchRestaurantsUseCase.execute({
        q: 'bún bò',
        lat: 10.7725,
        lon: 106.7027,
      });

      expect(mockEsService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            function_score: expect.objectContaining({
              functions: expect.arrayContaining([
                expect.objectContaining({
                  gauss: expect.objectContaining({
                    location: expect.objectContaining({
                      scale: '3km',
                      decay: 0.5,
                    }),
                  }),
                  weight: 2.0,
                }),
                expect.objectContaining({
                  field_value_factor: expect.objectContaining({
                    field: 'rating',
                    modifier: 'sqrt',
                    missing: 3.0,
                  }),
                  weight: 1.5,
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES (EC)
  // ==========================================
  describe('Nhánh 2: Edge Cases (EC)', () => {
    it('EC-01: Tọa độ người dùng nằm sát biên bán kính (10km) vẫn được cấu hình chính xác vào geo_distance filter', async () => {
      mockEsService.search.mockResolvedValueOnce({ hits: { hits: [] } });

      await searchRestaurantsUseCase.execute({
        lat: 10.7725,
        lon: 106.7027,
        radius: '10km',
      });

      expect(mockEsService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            function_score: expect.objectContaining({
              query: expect.objectContaining({
                bool: expect.objectContaining({
                  filter: expect.arrayContaining([
                    expect.objectContaining({
                      geo_distance: expect.objectContaining({
                        distance: '10km',
                        location: { lat: 10.7725, lon: 106.7027 },
                      }),
                    }),
                  ]),
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('EC-02: Từ khóa tìm kiếm chứa ký tự đặc biệt (*, %, ngoặc kép) được trim sạch và xử lý an toàn', async () => {
      mockEsService.search.mockResolvedValueOnce({ hits: { hits: [] } });

      await searchRestaurantsUseCase.execute({
        q: '   "Phở Đặc Biệt" * %   ',
      });

      expect(mockEsService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: expect.arrayContaining([
                expect.objectContaining({
                  multi_match: expect.objectContaining({
                    query: '"Phở Đặc Biệt" * %',
                  }),
                }),
              ]),
            }),
          }),
        }),
      );
    });

    it('EC-03: Quán ăn chưa có đánh giá nào (rating = null/0) tự fallback về missing: 3.0 an toàn', async () => {
      mockEsService.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'rest-new',
              _source: {
                id: 'rest-new',
                name: 'Quán Mới Mở',
                rating: 0,
              },
            },
          ],
        },
      });

      const res = await searchRestaurantsUseCase.execute({
        q: 'Quán Mới',
        lat: 10.1,
        lon: 106.1,
      });

      expect(res).toHaveLength(1);
      expect(res[0].rating).toBe(0);
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR & REJECTION FLOW (ER)
  // ==========================================
  describe('Nhánh 3: Error & Rejection Flow (ER)', () => {
    it('ER-01: Từ khóa rỗng hoặc < 2 ký tự trong suggester trả về mảng rỗng ngay mà không query cluster', async () => {
      const resShort = await suggestSearchUseCase.execute({ q: 'a' });
      const resEmpty = await suggestSearchUseCase.execute({ q: '   ' });

      expect(resShort).toEqual({ keywords: [], dishes: [], restaurants: [] });
      expect(resEmpty).toEqual({ keywords: [], dishes: [], restaurants: [] });
      expect(mockEsService.search).not.toHaveBeenCalled();
    });

    it('ER-02: Elasticsearch cluster tạm thời ngắt kết nối ném ServiceUnavailableException có root cause, không nuốt lỗi', async () => {
      mockEsService.search.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        searchRestaurantsUseCase.execute({ q: 'phở' }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('ER-03: Direct Menu Search lỗi, tự động kích hoạt fallback sang SearchReadRepository an toàn', async () => {
      // 1. ES menu_items search fails
      mockEsService.search.mockRejectedValueOnce(new Error('Index menu_items not available'));

      // 2. Fallback calls ES restaurants search, succeeds
      mockEsService.search.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'rest-1',
              _source: { id: 'rest-1', name: 'Quán Ăn Gia Đình' },
            },
          ],
        },
      });

      // 3. SearchReadRepo returns items
      mockSearchReadRepo.getMenuItemsForRestaurants.mockResolvedValueOnce([
        {
          id: 'item-1',
          restaurant_id: 'rest-1',
          name: 'Cơm Chiên Dương Châu',
          price: 40000,
          is_available: true,
        },
      ]);

      const result = await searchMenuUseCase.execute({ q: 'cơm' });

      expect(result).toHaveLength(1);
      expect(result[0].restaurant).toBe('Quán Ăn Gia Đình');
      expect(result[0].items[0].name).toBe('Cơm Chiên Dương Châu');
      expect(mockSearchReadRepo.getMenuItemsForRestaurants).toHaveBeenCalledWith(
        ['rest-1'],
        expect.anything(),
      );
    });
  });
});
