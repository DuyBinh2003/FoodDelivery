/**
 * @file home-feed.test.ts
 * @description Unit tests for Home Feed calculation, filtering, ETA estimation, and distance formatting.
 * @traceability
 * - Issue: #67 - Nâng cấp giao diện trang homepage
 * - Plan: docs/plans/customer/customer-homepage-revamp.md
 * - Target: frontend/src/features/home/utils/home-feed.utils.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRestaurantEtaMinutes,
  enrichRestaurantsWithLocation,
  filterNearYouRestaurants,
  filterPromoRestaurants,
  filterTopRatedRestaurants,
  filterRestaurantsByCategory,
  formatDistanceDisplay,
  formatEtaDisplay,
  type HomeRestaurantItem,
  type EnrichedRestaurantItem,
} from '../utils/home-feed.utils.ts';

describe('Home Feed & Personalization Suite (Frontend)', () => {
  const mockUserLat = 10.772545; // Quận 1
  const mockUserLng = 106.702758;

  const mockRestaurants: HomeRestaurantItem[] = [
    {
      id: 'rest-1',
      name: 'Cơm Tấm Ba Ghiền',
      lat: 10.7745,
      lon: 106.7045, // Rất gần (~0.3 km)
      rating: 4.8,
      is_active: true,
      is_freeship: true,
      discount_label: 'GIẢM 20K',
      categories: [{ id: 'com', name: 'Cơm' }],
    },
    {
      id: 'rest-2',
      name: 'Trà Sữa Phượng Hoàng',
      lat: 10.782,
      lon: 106.712, // ~1.5 km
      rating: 4.6,
      is_active: true,
      is_freeship: false,
      discount_label: 'FREESHIP 0Đ',
      categories: [{ id: 'tra-sua', name: 'Trà sữa' }],
    },
    {
      id: 'rest-3',
      name: 'Phở Bò Gia Truyền Nam Định',
      lat: 10.795,
      lon: 106.725, // ~3.4 km
      rating: 4.2,
      is_active: true,
      is_freeship: true,
      discount_label: null,
      categories: [{ id: 'pho-bun', name: 'Phở & Bún' }],
    },
    {
      id: 'rest-4',
      name: 'Gà Rán Giòn Rụm Thủ Đức',
      lat: 10.85,
      lon: 106.77, // Xa (~11.0 km)
      rating: 4.9,
      is_active: true,
      is_freeship: false,
      discount_label: null,
      categories: [{ id: 'ga-ran', name: 'Gà rán' }],
    },
    {
      id: 'rest-inactive',
      name: 'Quán Tạm Đóng Cửa',
      lat: 10.773,
      lon: 106.703,
      rating: 4.7,
      is_active: false,
      categories: [{ id: 'com', name: 'Cơm' }],
    },
  ];

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. enrichRestaurantsWithLocation: Bổ sung cự ly km và ETA phút chính xác', () => {
      const enriched = enrichRestaurantsWithLocation(mockRestaurants, mockUserLat, mockUserLng);
      assert.strictEqual(enriched.length, mockRestaurants.length);

      // Quán 1 rất gần (< 1km)
      assert.ok(enriched[0].distance_km > 0 && enriched[0].distance_km < 1.0);
      assert.ok(enriched[0].eta_minutes >= 12 && enriched[0].eta_minutes <= 20);

      // Quán 4 xa (> 10km)
      assert.ok(enriched[3].distance_km > 8.0);
      assert.ok(enriched[3].eta_minutes > 25);
    });

    it('2. filterNearYouRestaurants: Lọc quán trong bán kính <= 3.5km và sắp xếp tăng dần', () => {
      const enriched = enrichRestaurantsWithLocation(mockRestaurants, mockUserLat, mockUserLng);
      const nearYou = filterNearYouRestaurants(enriched, 3.5, 25);

      // Quán 1, 2 thỏa điều kiện; quán 3 quá 25p hoặc gần biên; quán 4 xa 11km; quán inactive bị loại
      assert.ok(nearYou.length >= 2);
      assert.strictEqual(nearYou[0].id, 'rest-1'); // Gần nhất
      assert.ok(nearYou[0].distance_km <= nearYou[1].distance_km);
    });

    it('3. filterPromoRestaurants: Lọc quán có cờ freeship hoặc mã giảm giá', () => {
      const enriched = enrichRestaurantsWithLocation(mockRestaurants, mockUserLat, mockUserLng);
      const promo = filterPromoRestaurants(enriched);

      const promoIds = promo.map((r) => r.id);
      assert.ok(promoIds.includes('rest-1')); // Có freeship & giảm 20k
      assert.ok(promoIds.includes('rest-2')); // Có discount_label FREESHIP 0Đ
      assert.ok(promoIds.includes('rest-3')); // Có is_freeship
      assert.strictEqual(promoIds.includes('rest-4'), false); // Không có promo
      assert.strictEqual(promoIds.includes('rest-inactive'), false); // Bị loại vì inactive
    });

    it('4. filterTopRatedRestaurants: Lọc quán có rating >= 4.5 và xếp giảm dần', () => {
      const enriched = enrichRestaurantsWithLocation(mockRestaurants, mockUserLat, mockUserLng);
      const topRated = filterTopRatedRestaurants(enriched, 4.5);

      const topIds = topRated.map((r) => r.id);
      assert.ok(topIds.includes('rest-4')); // 4.9 sao
      assert.ok(topIds.includes('rest-1')); // 4.8 sao
      assert.ok(topIds.includes('rest-2')); // 4.6 sao
      assert.strictEqual(topIds.includes('rest-3'), false); // 4.2 sao bị loại

      // Sắp xếp giảm dần theo điểm số
      assert.strictEqual(topRated[0].id, 'rest-4');
      assert.strictEqual(topRated[1].id, 'rest-1');
    });

    it('5. filterRestaurantsByCategory: Lọc chính xác theo danh mục được chọn', () => {
      const enriched = enrichRestaurantsWithLocation(mockRestaurants, mockUserLat, mockUserLng);

      const comList = filterRestaurantsByCategory(enriched, 'com');
      assert.strictEqual(comList.length, 2);

      const traSuaList = filterRestaurantsByCategory(enriched, 'tra-sua');
      assert.strictEqual(traSuaList.length, 1);
      assert.strictEqual(traSuaList[0].id, 'rest-2');

      const allList = filterRestaurantsByCategory(enriched, 'ALL');
      assert.strictEqual(allList.length, mockRestaurants.length);
    });

    it('6. formatDistanceDisplay & formatEtaDisplay: Hiển thị giao diện người dùng đẹp mắt', () => {
      assert.strictEqual(formatDistanceDisplay(0.45), '450m');
      assert.strictEqual(formatDistanceDisplay(2.4), '2.4km');
      assert.strictEqual(formatEtaDisplay(18), '18 phút');
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (BIÊN & ĐẶC BIỆT)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Tọa độ người dùng và nhà hàng trùng khớp nhau', () => {
      const sameCoordsRestaurant: HomeRestaurantItem[] = [
        {
          id: 'rest-same',
          name: 'Quán Tại Chỗ',
          lat: mockUserLat,
          lon: mockUserLng,
          rating: 4.5,
          is_active: true,
        },
      ];
      const enriched = enrichRestaurantsWithLocation(sameCoordsRestaurant, mockUserLat, mockUserLng);
      assert.strictEqual(enriched[0].distance_km, 0);
      assert.strictEqual(enriched[0].eta_minutes, 15); // Baseline an toàn
    });

    it('2. Bán kính lọc cực nhỏ hoặc không có quán nào thỏa điều kiện', () => {
      const enriched = enrichRestaurantsWithLocation(mockRestaurants, mockUserLat, mockUserLng);
      const nearYouStrict = filterNearYouRestaurants(enriched, 0.1, 10);
      assert.deepStrictEqual(nearYouStrict, []);
    });

    it('3. Ngưỡng rating biên (4.49 bị loại, 4.50 được chọn)', () => {
      const borderRestaurants: HomeRestaurantItem[] = [
        { id: 'b-1', name: 'Quán 4.49', rating: 4.49, is_active: true },
        { id: 'b-2', name: 'Quán 4.50', rating: 4.5, is_active: true },
      ];
      const enriched = enrichRestaurantsWithLocation(borderRestaurants, mockUserLat, mockUserLng);
      const topRated = filterTopRatedRestaurants(enriched, 4.5);
      assert.strictEqual(topRated.length, 1);
      assert.strictEqual(topRated[0].id, 'b-2');
    });

    it('4. Khoảng cách giao hàng cực xa (> 50km) bị chặn trần ETA tối đa 90 phút', () => {
      const eta = calculateRestaurantEtaMinutes(80);
      assert.strictEqual(eta, 90);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('1. Tọa độ người dùng hoặc nhà hàng bị null/undefined/NaN', () => {
      const malformedRestaurants: HomeRestaurantItem[] = [
        { id: 'err-1', name: 'Lỗi Lat', lat: NaN, lon: 106.7, is_active: true },
        { id: 'err-2', name: 'Thiếu Tọa độ', lat: null, lon: null, is_active: true },
      ];

      const enriched = enrichRestaurantsWithLocation(malformedRestaurants, mockUserLat, mockUserLng);
      assert.strictEqual(enriched[0].distance_km, 0);
      assert.strictEqual(enriched[1].distance_km, 0);
    });

    it('2. Mảng danh sách nhà hàng đầu vào null hoặc undefined', () => {
      assert.deepStrictEqual(
        enrichRestaurantsWithLocation(null as unknown as HomeRestaurantItem[], mockUserLat, mockUserLng),
        [],
      );
      assert.deepStrictEqual(
        filterNearYouRestaurants(null as unknown as EnrichedRestaurantItem[]),
        [],
      );
      assert.deepStrictEqual(
        filterPromoRestaurants(null as unknown as EnrichedRestaurantItem[]),
        [],
      );
      assert.deepStrictEqual(
        filterTopRatedRestaurants(null as unknown as EnrichedRestaurantItem[]),
        [],
      );
    });

    it('3. Hàm format chống crash khi nhận giá trị âm hoặc NaN', () => {
      assert.strictEqual(formatDistanceDisplay(NaN), '0 m');
      assert.strictEqual(formatDistanceDisplay(-5), '0 m');
      assert.strictEqual(formatEtaDisplay(NaN), '15-20 phút');
      assert.strictEqual(formatEtaDisplay(-10), '15-20 phút');
    });
  });
});
