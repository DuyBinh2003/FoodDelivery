/**
 * [Requirement/Issue: #85]
 * [Target: Frontend - Circuit Breaker Degradation & Fallback Validation Suite]
 * [Compliance: testing-policy (Happy Path, Edge Cases, Error & Rejection Flow)]
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizePaginatedMenuResponse } from '../utils/menu-catalog.utils.ts';

interface FallbackCatalogItem {
  id: string;
  name: string;
  price: number;
  restaurant_name: string;
}

interface SearchResponse<T> {
  items: T[];
  total: number;
  isFallback?: boolean;
  circuitStatus?: 'CLOSED' | 'OPEN' | 'HALF_OPEN' | string;
  message?: string;
}

// Logic kiểm tra hiển thị Circuit Breaker Banner
function shouldRenderDegradationBanner(response: SearchResponse<unknown>): boolean {
  return Boolean(response.isFallback || response.circuitStatus === 'OPEN');
}

// Logic Fallback Client an toàn khi Search API bị nghẽn
async function safeSearchWithFallback<T>(
  apiCall: () => Promise<SearchResponse<T>>,
  fallbackSnapshot: T[],
): Promise<SearchResponse<T>> {
  try {
    return await apiCall();
  } catch {
    return {
      items: fallbackSnapshot,
      total: fallbackSnapshot.length,
      isFallback: true,
      circuitStatus: 'OPEN',
      message: 'Hệ thống tìm kiếm tức thời đang được tối ưu. Đang gợi ý các món ăn & quán ngon phổ biến gần bạn.',
    };
  }
}

describe('Frontend Search Circuit Breaker Degradation Suite (#85)', () => {
  const mockFallbackItems: FallbackCatalogItem[] = [
    { id: 'fb-1', name: 'Phở Bò Tái Nạm (Món Thịnh Hành)', price: 55000, restaurant_name: 'Phở Gia Truyền' },
    { id: 'fb-2', name: 'Cơm Tấm Sườn Bì Chả', price: 60000, restaurant_name: 'Cơm Tấm Ba Ghiền' },
    { id: 'fb-3', name: 'Trà Sữa Trân Châu Đường Đen', price: 35000, restaurant_name: 'Gong Cha' },
  ];

  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('🟢 [Happy Path] Search API hoạt động bình thường -> Không kích hoạt banner cảnh báo', async () => {
      const normalResponse: SearchResponse<FallbackCatalogItem> = {
        items: [{ id: 'dish-1', name: 'Bún Chả Hà Nội', price: 50000, restaurant_name: 'Bún Chả 36' }],
        total: 1,
        isFallback: false,
        circuitStatus: 'CLOSED',
      };

      const result = await safeSearchWithFallback(async () => normalResponse, mockFallbackItems);

      assert.strictEqual(result.isFallback, false);
      assert.strictEqual(shouldRenderDegradationBanner(result), false);
      assert.strictEqual(result.items[0].name, 'Bún Chả Hà Nội');
    });

    it('🟢 [Happy Path] Response trả về isFallback = true -> Hiển thị Degradation Banner', () => {
      const fallbackResponse: SearchResponse<FallbackCatalogItem> = {
        items: mockFallbackItems,
        total: 3,
        isFallback: true,
        circuitStatus: 'OPEN',
      };

      assert.strictEqual(shouldRenderDegradationBanner(fallbackResponse), true);
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('🟡 [Edge Case] Trạng thái HALF_OPEN không có cờ isFallback -> Không hiển thị banner (đang canary test)', () => {
      const halfOpenResponse: SearchResponse<FallbackCatalogItem> = {
        items: [{ id: 'canary-1', name: 'Canary Test Item', price: 30000, restaurant_name: 'Test' }],
        total: 1,
        isFallback: false,
        circuitStatus: 'HALF_OPEN',
      };

      assert.strictEqual(shouldRenderDegradationBanner(halfOpenResponse), false);
    });

    it('🟡 [Edge Case] Dữ liệu fallback trả về danh sách rỗng -> Vẫn kích hoạt banner thông báo cho người dùng', () => {
      const emptyFallbackResponse: SearchResponse<unknown> = {
        items: [],
        total: 0,
        isFallback: true,
        circuitStatus: 'OPEN',
      };

      assert.strictEqual(shouldRenderDegradationBanner(emptyFallbackResponse), true);
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Kích Hoạt Dự Phòng)', () => {
    it('🔴 [Error Flow] API ném lỗi (OpenSearch 500/504) -> safeSearchWithFallback tự động trả về snapshot mà không crash app', async () => {
      const failingApiCall = async (): Promise<SearchResponse<FallbackCatalogItem>> => {
        throw new Error('504 Gateway Timeout: OpenSearch Cluster Unresponsive');
      };

      const result = await safeSearchWithFallback(failingApiCall, mockFallbackItems);

      assert.strictEqual(result.isFallback, true);
      assert.strictEqual(result.circuitStatus, 'OPEN');
      assert.strictEqual(result.items.length, 3);
      assert.strictEqual(result.items[0].name, 'Phở Bò Tái Nạm (Món Thịnh Hành)');
      assert.strictEqual(shouldRenderDegradationBanner(result), true);
    });

    it('🔴 [Error Flow] normalizePaginatedMenuResponse xử lý an toàn object Circuit Breaker OPEN từ /search/menu', () => {
      const normalized = normalizePaginatedMenuResponse({
        items: mockFallbackItems,
        total: 3,
        isFallback: true,
        circuitStatus: 'OPEN',
        message: 'Hệ thống tìm kiếm tức thời đang được tối ưu.',
      });

      assert.strictEqual(normalized.isFallback, true);
      assert.strictEqual(normalized.circuitStatus, 'OPEN');
      assert.strictEqual(normalized.sections.length, 3);
      assert.strictEqual(normalized.pagination.totalDishes, 3);
      assert.strictEqual(normalized.pagination.hasMore, false);
    });
  });
});
