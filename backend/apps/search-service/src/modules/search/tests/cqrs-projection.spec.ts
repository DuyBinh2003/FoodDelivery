/**
 * [Requirement/Issue: #85]
 * [Target: SearchService - CQRS Catalog Projection & Resilience Circuit Breaker]
 * [Compliance: testing-policy (Happy Path, Edge Cases, Error & Rejection Flow)]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ElasticsearchRepository } from '@/modules/search/repositories/elasticsearch.repository.js';
import { SearchController } from '@/modules/search/search.controller.js';

describe('SearchService - CQRS Projection & Circuit Breaker (#85)', () => {
  let elasticsearchRepo: ElasticsearchRepository;
  let mockEsService: any;
  let searchController: SearchController;

  let mockSearchMenuUseCase: any;
  let mockSearchRestaurantsUseCase: any;
  let mockSuggestUseCase: any;
  let mockGetCategoriesUseCase: any;
  let mockGetTagsUseCase: any;
  let mockSyncUseCase: any;

  beforeEach(() => {
    mockEsService = {
      update: vi.fn().mockResolvedValue({ result: 'updated' }),
      delete: vi.fn().mockResolvedValue({ result: 'deleted' }),
      search: vi.fn(),
    };

    elasticsearchRepo = new ElasticsearchRepository(mockEsService as any);

    mockSearchMenuUseCase = {
      execute: vi.fn().mockResolvedValue({ items: [{ id: 'dish-1', name: 'Phở bò', price: 40000 }], total: 1 }),
    };
    mockSearchRestaurantsUseCase = {
      execute: vi.fn().mockResolvedValue({ items: [{ id: 'rest-1', name: 'Quán ăn ngon' }], total: 1 }),
    };
    mockSuggestUseCase = { execute: vi.fn() };
    mockGetCategoriesUseCase = { execute: vi.fn() };
    mockGetTagsUseCase = { execute: vi.fn() };
    mockSyncUseCase = { syncAll: vi.fn() };

    searchController = new SearchController(
      mockSearchMenuUseCase,
      mockSearchRestaurantsUseCase,
      mockSuggestUseCase,
      mockGetCategoriesUseCase,
      mockGetTagsUseCase,
      mockSyncUseCase,
      elasticsearchRepo,
    );
  });

  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('🟢 [Happy Path] Đồng bộ CQRS: Cập nhật tồn kho món ăn (is_available = false) sang Elasticsearch', async () => {
      await elasticsearchRepo.updateMenuItemProjection('item-123', { is_available: false });

      expect(mockEsService.update).toHaveBeenCalledWith({
        index: 'menu_items',
        id: 'item-123',
        doc: { is_available: false },
      });
    });

    it('🟢 [Happy Path] Đồng bộ CQRS: Cập nhật giá mới và tên món ăn', async () => {
      await elasticsearchRepo.updateMenuItemProjection('item-123', {
        price: 45000,
        name: 'Cơm tấm sườn bì chả đặc biệt',
      });

      expect(mockEsService.update).toHaveBeenCalledWith({
        index: 'menu_items',
        id: 'item-123',
        doc: { price: 45000, name: 'Cơm tấm sườn bì chả đặc biệt' },
      });
    });

    it('🟢 [Happy Path] Đồng bộ CQRS: Cập nhật trạng thái nhà hàng (is_active = false)', async () => {
      await elasticsearchRepo.updateRestaurantProjection('rest-456', { is_active: false });

      expect(mockEsService.update).toHaveBeenCalledWith({
        index: 'restaurants',
        id: 'rest-456',
        doc: { is_active: false },
      });
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('🟡 [Edge Case] Món ăn chưa có trong index (404) -> Xử lý êm ái không ném exception', async () => {
      mockEsService.update.mockRejectedValueOnce({
        meta: { statusCode: 404 },
        message: 'document_missing_exception',
      });

      await expect(
        elasticsearchRepo.updateMenuItemProjection('missing-item', { is_available: false }),
      ).resolves.not.toThrow();
    });

    it('🟡 [Edge Case] Search Controller endpoint gọi updateMenuItemProjection trả về kết quả chuẩn', async () => {
      const result = await searchController.updateMenuItemProjection('item-123', {
        is_available: true,
        price: 50000,
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('item-123');
      expect(result.updated.price).toBe(50000);
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Circuit Breaker)', () => {
    it('🔴 [Error Flow] Khi Search UseCase ném lỗi (OpenSearch down) -> Circuit Breaker trả về Fallback Data', async () => {
      mockSearchMenuUseCase.execute.mockRejectedValue(new Error('Connection Refused to OpenSearch'));

      const res = (await searchController.searchMenu({ q: 'bún bò' })) as {
        isFallback?: boolean;
        circuitStatus?: string;
        items: unknown[];
      };

      expect(res.isFallback).toBe(true);
      expect(res.circuitStatus).toBe('OPEN');
      expect(res.items.length).toBeGreaterThan(0);
    });
  });
});
