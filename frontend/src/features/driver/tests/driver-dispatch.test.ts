/**
 * @file driver-dispatch.test.ts
 * @description Unit tests for driver order routing, countdown timing math, offer validation, and formatting.
 * @traceability
 * - Issue: #29 - Thuật toán chia cuốc (Order Routing)
 * - Plan: docs/plans/driver/driver-order-routing-dispatch.md
 * - Features: docs/features/driver/order-routing-dispatch.md
 * - Target: frontend/src/features/driver/utils/dispatch.utils.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTripOffer,
  calculateRemainingCountdown,
  getCountdownColor,
  formatDriverEarnings,
  formatTripDistance,
} from '../utils/dispatch.utils.ts';
import type { TripOfferData } from '../components/driver-dashboard/incoming-trip-modal.tsx';

describe('Driver Dispatch & Order Routing Suite (Frontend)', () => {
  const validMockOffer: TripOfferData = {
    orderId: 'c2e8a10f-b4ef-4b2a-bf31-2fb0d5a3b901',
    restaurantName: 'Cơm Tấm Ba Ghiền',
    restaurantAddress: '84 Đặng Văn Ngữ, Phú Nhuận',
    restaurantLat: 10.7925,
    restaurantLng: 106.6712,
    deliveryAddress: '123 Lê Lợi, Bến Nghé, Quận 1',
    deliveryLat: 10.7731,
    deliveryLng: 106.7001,
    distanceKm: 3.8,
    deliveryFee: 32000,
    driverEarnings: 28800,
    itemsCount: 3,
    timeoutSeconds: 15,
    expiresAt: Date.now() + 15000,
  };

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. validateTripOffer: Xác thực thành công gói cuốc xe hợp lệ đầy đủ trường', () => {
      const isValid = validateTripOffer(validMockOffer);
      assert.strictEqual(isValid, true);
    });

    it('2. calculateRemainingCountdown: Tính toán chính xác số giây và phần trăm thanh đếm ngược', () => {
      const now = 1000000;
      const expiresAt = now + 12000; // Còn 12s

      const result = calculateRemainingCountdown(expiresAt, 15, now);
      assert.strictEqual(result.isExpired, false);
      assert.strictEqual(result.secondsLeft, 12);
      assert.strictEqual(result.percent, 80); // (12 / 15) * 100 = 80%
    });

    it('3. getCountdownColor: Trả về xanh khi còn > 8s, cam khi 5-8s, đỏ khi <= 4s', () => {
      assert.strictEqual(getCountdownColor(15), 'green');
      assert.strictEqual(getCountdownColor(9), 'green');
      assert.strictEqual(getCountdownColor(8), 'amber');
      assert.strictEqual(getCountdownColor(5), 'amber');
      assert.strictEqual(getCountdownColor(4), 'red');
      assert.strictEqual(getCountdownColor(1), 'red');
    });

    it('4. formatDriverEarnings: Định dạng tiền tệ VND chính xác theo chuẩn bản địa', () => {
      const formatted = formatDriverEarnings(28800);
      assert.ok(formatted.includes('28.800') || formatted.includes('28,800'));
      assert.ok(formatted.includes('₫') || formatted.includes('VND'));
    });

    it('5. formatTripDistance: Hiển thị km hoặc m chuẩn xác', () => {
      assert.strictEqual(formatTripDistance(4.5), '4.5 km');
      assert.strictEqual(formatTripDistance(0.65), '650 m');
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (BIÊN & ĐẶC BIỆT)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Hết hạn đúng tại thời điểm 0ms hoặc thời gian trôi qua quá mức', () => {
      const now = 2000000;
      const expiresAt = now; // 0ms chênh lệch

      const result = calculateRemainingCountdown(expiresAt, 15, now);
      assert.strictEqual(result.isExpired, true);
      assert.strictEqual(result.secondsLeft, 0);
      assert.strictEqual(result.percent, 0);
    });

    it('2. Đồng hồ máy khách bị trễ (skew) khiến expiresAt nhỏ hơn Date.now()', () => {
      const now = 2000000;
      const expiresAt = now - 5000; // Đã quá hạn 5 giây trước

      const result = calculateRemainingCountdown(expiresAt, 15, now);
      assert.strictEqual(result.isExpired, true);
      assert.strictEqual(result.secondsLeft, 0);
    });

    it('3. Khoảng cách giao hàng cực ngắn (< 1km) và mốc 0km', () => {
      assert.strictEqual(formatTripDistance(0), '0 m');
      assert.strictEqual(formatTripDistance(0.05), '50 m');
      assert.strictEqual(formatTripDistance(0.999), '999 m');
    });

    it('4. Thu nhập tài xế số 0 hoặc số lớn', () => {
      const zeroFormatted = formatDriverEarnings(0);
      assert.ok(zeroFormatted.includes('0'));

      const largeFormatted = formatDriverEarnings(1500000);
      assert.ok(largeFormatted.includes('1.500.000') || largeFormatted.includes('1,500,000'));
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('1. validateTripOffer: Từ chối các payload rỗng, null, undefined hoặc kiểu dữ liệu sai', () => {
      assert.strictEqual(validateTripOffer(null), false);
      assert.strictEqual(validateTripOffer(undefined), false);
      assert.strictEqual(validateTripOffer('string-data'), false);
      assert.strictEqual(validateTripOffer(12345), false);
      assert.strictEqual(validateTripOffer({}), false);
    });

    it('2. validateTripOffer: Từ chối khi thiếu orderId hoặc orderId chỉ chứa khoảng trắng', () => {
      assert.strictEqual(
        validateTripOffer({ ...validMockOffer, orderId: '' }),
        false,
      );
      assert.strictEqual(
        validateTripOffer({ ...validMockOffer, orderId: '   ' }),
        false,
      );
    });

    it('3. validateTripOffer: Từ chối khi tọa độ GPS bị NaN hoặc sai kiểu', () => {
      assert.strictEqual(
        validateTripOffer({ ...validMockOffer, restaurantLat: NaN }),
        false,
      );
      assert.strictEqual(
        validateTripOffer({ ...validMockOffer, deliveryLng: '106.7' as unknown as number }),
        false,
      );
    });

    it('4. validateTripOffer: Từ chối khi driverEarnings hoặc distanceKm âm', () => {
      assert.strictEqual(
        validateTripOffer({ ...validMockOffer, driverEarnings: -5000 }),
        false,
      );
      assert.strictEqual(
        validateTripOffer({ ...validMockOffer, distanceKm: -1 }),
        false,
      );
    });

    it('5. calculateRemainingCountdown & formatters: Chống crash với NaN hoặc giá trị không hợp lệ', () => {
      const countdown = calculateRemainingCountdown(NaN, 15);
      assert.strictEqual(countdown.isExpired, true);
      assert.strictEqual(countdown.secondsLeft, 0);

      assert.strictEqual(formatDriverEarnings(NaN), '0 ₫');
      assert.strictEqual(formatDriverEarnings(-1000), '0 ₫');
      assert.strictEqual(formatTripDistance(NaN), '0 m');
      assert.strictEqual(formatTripDistance(-5), '0 m');
    });
  });
});
