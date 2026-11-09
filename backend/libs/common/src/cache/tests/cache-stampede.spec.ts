/**
 * @requirement Issue #81 - High Concurrency Cache Stampede & Singleflight Defense
 * @scenario Cache Stampede & Singleflight Suite (3-Branch Testing)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SingleflightService } from '@/common/cache/singleflight.service.js';
import { CacheStampedeService } from '@/common/cache/cache-stampede.service.js';
import { shouldXFetch } from '@/common/cache/xfetch.util.js';

describe('Cache Stampede & Singleflight Defense Suite (#81)', () => {
  let singleflightService: SingleflightService;
  let cacheStampedeService: CacheStampedeService;

  beforeEach(() => {
    singleflightService = new SingleflightService();
    cacheStampedeService = new CacheStampedeService(singleflightService);
  });

  describe('🟢 Nhánh 1: Happy Path', () => {
    it('HP-01: 50 requests đồng thời truy vấn cùng 1 key -> Fetcher DB chỉ được gọi đúng 1 lần', async () => {
      /**
       * @requirement Issue #81
       * @scenario 50 requests đồng thời cùng mili-giây
       * @expected Singleflight gộp thành 1 query duy nhất, 49 requests dùng chung kết quả
       */
      let dbQueryCount = 0;
      const mockDbFetcher = vi.fn(async () => {
        dbQueryCount++;
        await new Promise((resolve) => setTimeout(resolve, 20)); // Giả lập độ trễ DB 20ms
        return [{ id: 'dish-1', name: 'Cơm tấm Sài Gòn', price: 45000 }];
      });

      // Bắn 50 requests đồng thời
      const promises = Array.from({ length: 50 }).map(() =>
        cacheStampedeService.getOrSet('menu:restaurant-101', mockDbFetcher, { ttlSeconds: 60 }),
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(50);
      expect(dbQueryCount).toBe(1); // CHỈ ĐÚNG 1 QUERY SQL!
      expect(results[0]).toEqual([{ id: 'dish-1', name: 'Cơm tấm Sài Gòn', price: 45000 }]);
      expect(results[49]).toEqual([{ id: 'dish-1', name: 'Cơm tấm Sài Gòn', price: 45000 }]);
    });

    it('HP-02: Lần gọi tiếp theo khi cache còn hạn -> Trả về cache tức thì với độ trễ 0ms', async () => {
      /**
       * @requirement Issue #81
       * @scenario Cache hit bình thường
       * @expected Đọc trực tiếp từ cache, không gọi fetcher
       */
      const mockFetcher = vi.fn(async () => ({ total: 100 }));
      await cacheStampedeService.getOrSet('stats:summary', mockFetcher, { ttlSeconds: 300 });

      // Gọi lần 2
      const secondCall = await cacheStampedeService.getOrSet('stats:summary', mockFetcher);
      expect(secondCall).toEqual({ total: 100 });
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('🟡 Nhánh 2: Edge Cases (XFetch Probabilistic Early Refresh)', () => {
    it('EC-01: Thuật toán XFetch kích hoạt làm mới khi TTL còn ngắn và thời gian tính toán lớn', () => {
      /**
       * @requirement Issue #81
       * @scenario TTL remaining = 2s, delta = 5000ms (query nặng), beta = 1.0
       * @expected shouldXFetch trả về true để refresh ngầm
       */
      // With rand = 0.5: -1.0 * 5.0 * ln(0.5) = -5 * (-0.693) = 3.465 > 2.0 -> TRUE
      const shouldRefresh = shouldXFetch(5000, 1.0, 2.0, 0.5);
      expect(shouldRefresh).toBe(true);
    });

    it('EC-02: Thuật toán XFetch không làm mới khi TTL còn dài', () => {
      /**
       * @requirement Issue #81
       * @scenario TTL remaining = 50s, delta = 200ms
       * @expected shouldXFetch trả về false
       */
      const shouldRefresh = shouldXFetch(200, 1.0, 50.0, 0.5);
      expect(shouldRefresh).toBe(false);
    });

    it('EC-03: forceRefresh = true -> Bỏ qua cache hiện có và gọi lại fetcher', async () => {
      /**
       * @requirement Issue #81
       * @scenario Buộc làm mới dữ liệu
       * @expected Gọi fetcher lần thứ 2 dù cache chưa hết hạn
       */
      let counter = 1;
      const fetcher = vi.fn(async () => ({ version: counter++ }));

      const res1 = await cacheStampedeService.getOrSet('item:v1', fetcher);
      expect(res1.version).toBe(1);

      const res2 = await cacheStampedeService.getOrSet('item:v1', fetcher, { forceRefresh: true });
      expect(res2.version).toBe(2);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('🔴 Nhánh 3: Error & Rejection Flow', () => {
    it('ER-01: Fetcher ném lỗi exception -> Singleflight dọn dẹp in-flight map sạch sẽ, không gây deadlock', async () => {
      /**
       * @requirement Issue #81
       * @scenario Database bị lỗi kết nối
       * @expected Ném lỗi đúng, giải phóng in-flight map để request sau có thể thử lại
       */
      const failingFetcher = vi.fn(async () => {
        throw new Error('Database connection pool exhausted');
      });

      await expect(
        cacheStampedeService.getOrSet('error:key', failingFetcher),
      ).rejects.toThrow('Database connection pool exhausted');

      expect(singleflightService.getInFlightCount()).toBe(0);

      // Thử lại lần sau với fetcher phục hồi
      const healthyFetcher = vi.fn(async () => 'recovered data');
      const recovered = await cacheStampedeService.getOrSet('error:key', healthyFetcher);
      expect(recovered).toBe('recovered data');
    });
  });
});

