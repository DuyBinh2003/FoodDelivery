/**
 * @file loyalty-checkout.test.ts
 * @description Unit tests for Loyalty UI calculations, points redemption validation, and tier progression
 * @traceability
 *   - Plan: docs/plans/customer/customer-loyalty-ui.md
 *   - Doc: docs/plans/platform/loyalty-points-rewards-engine.md
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscountFromPoints,
  calculateMaxAllowedPoints,
  validatePointsRedemption,
  calculateTierProgress,
} from '../utils/loyalty-calculator.ts';

describe('Loyalty Frontend Calculations & Validation', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Quy đổi 500 điểm thành 5.000 VND theo tỷ lệ chuẩn (1 điểm = 10 VND)', () => {
      const discount = calculateDiscountFromPoints(500);
      assert.strictEqual(discount, 5000);
    });

    it('2. Tính đúng số điểm tối đa được dùng khi khách có dư điểm nhưng bị chặn bởi trần 50% subtotal', () => {
      // Subtotal = 100.000 VND -> Max discount = 50.000 VND -> Max 5.000 điểm
      // Khách có 10.000 điểm -> Chỉ được dùng tối đa 5.000 điểm
      const maxAllowed = calculateMaxAllowedPoints(10000, 100000);
      assert.strictEqual(maxAllowed, 5000);
    });

    it('3. Cho phép quy đổi khi số điểm hợp lệ và nhỏ hơn trần 50%', () => {
      // Subtotal = 200.000 VND, Khách có 2.000 điểm, muốn dùng 500 điểm (5.000 VND <= 100.000 VND)
      const result = validatePointsRedemption(500, 2000, 200000);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.error, undefined);
    });

    it('4. Tính đúng tiến độ nâng hạng từ BRONZE lên SILVER', () => {
      // BRONZE: 0 - 1000 pts. Khách có 400 pts -> 40%, còn thiếu 600 pts
      const progress = calculateTierProgress('BRONZE', 400);
      assert.strictEqual(progress.targetPoints, 1000);
      assert.strictEqual(progress.progressPercent, 40);
      assert.strictEqual(progress.pointsRemaining, 600);
      assert.strictEqual(progress.isMaxTier, false);
    });

    it('5. Tính đúng tiến độ nâng hạng từ SILVER lên GOLD', () => {
      // SILVER: 1000 - 5000 pts (range = 4000). Khách có 3000 pts -> (3000 - 1000)/4000 = 50%
      const progress = calculateTierProgress('SILVER', 3000);
      assert.strictEqual(progress.targetPoints, 5000);
      assert.strictEqual(progress.progressPercent, 50);
      assert.strictEqual(progress.pointsRemaining, 2000);
      assert.strictEqual(progress.isMaxTier, false);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (TRƯỜNG HỢP BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Đơn hàng 0 VND hoặc âm: Số điểm tối đa được phép dùng bằng 0', () => {
      assert.strictEqual(calculateMaxAllowedPoints(1000, 0), 0);
      assert.strictEqual(calculateMaxAllowedPoints(1000, -50000), 0);
    });

    it('2. Khách hàng có ít hơn 100 điểm: Số điểm tối đa được phép dùng bằng 0', () => {
      assert.strictEqual(calculateMaxAllowedPoints(99, 100000), 0);
      assert.strictEqual(calculateMaxAllowedPoints(0, 100000), 0);
    });

    it('3. Điểm đổi chạm đúng mức biên 100 điểm: Quy đổi thành công 1.000 VND', () => {
      const discount = calculateDiscountFromPoints(100);
      assert.strictEqual(discount, 1000);

      const result = validatePointsRedemption(100, 100, 50000);
      assert.strictEqual(result.isValid, true);
    });

    it('4. Khách hàng đạt hạng PLATINUM (hạng tối đa): target = null, progress = 100%, isMaxTier = true', () => {
      const progress = calculateTierProgress('PLATINUM', 35000);
      assert.strictEqual(progress.targetPoints, null);
      assert.strictEqual(progress.progressPercent, 100);
      assert.strictEqual(progress.pointsRemaining, 0);
      assert.strictEqual(progress.isMaxTier, true);
    });

    it('5. Người dùng không chọn dùng điểm (0 điểm): validate thành công', () => {
      const result = validatePointsRedemption(0, 500, 100000);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.error, undefined);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOWS (TỪ CHỐI & BẢO VỆ)
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('1. Nhập số điểm dưới 100 điểm: Báo lỗi yêu cầu tối thiểu', () => {
      const result = validatePointsRedemption(50, 1000, 100000);
      assert.strictEqual(result.isValid, false);
      assert.match(result.error || '', /tối thiểu là 100 điểm/i);
    });

    it('2. Nhập số điểm vượt quá số dư khả dụng trong ví: Báo lỗi vượt quá số dư', () => {
      // Khách có 300 điểm nhưng nhập 400 điểm
      const result = validatePointsRedemption(400, 300, 200000);
      assert.strictEqual(result.isValid, false);
      assert.match(result.error || '', /vượt quá số dư khả dụng/i);
    });

    it('3. Nhập số điểm vượt quá trần 50% Subtotal: Báo lỗi vi phạm quy định', () => {
      // Subtotal = 40.000 VND -> Max 50% = 20.000 VND (tương đương 2.000 điểm)
      // Khách có 5.000 điểm và nhập dùng 2.500 điểm (25.000 VND)
      const result = validatePointsRedemption(2500, 5000, 40000);
      assert.strictEqual(result.isValid, false);
      assert.match(result.error || '', /vượt quá 50% tiền món/i);
    });
  });
});
