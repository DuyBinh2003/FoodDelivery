/**
 * @file voucher-checkout.test.ts
 * @description Unit tests for Voucher frontend stacking, calculation clamping, and 4-tier mutual exclusion
 * @traceability
 *   - Plan: docs/plans/platform/enterprise-voucher-management-engine.md
 *   - Scenarios:
 *     1. Happy Path: 4-tier stacking calculation, subtotal discount and shipping discount segregation
 *     2. Edge Cases: Discount exceeding basket total clamped to 0, zero shipping fee, boundary min_order_amount
 *     3. Error Flow: Duplicate category selection rejected by tier mutual exclusion validator
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateVoucherDiscounts,
  validateTierMutualExclusion,
  isVoucherSubtotalEligible,
  type AppliedVoucher,
} from '../utils/voucher-calculator.ts';

describe('Enterprise Voucher UI Calculator & Stacking Logic', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Áp dụng gộp 4 tầng mã ưu đãi hợp lệ tính đúng số tiền thanh toán cuối cùng', () => {
      const vouchers: AppliedVoucher[] = [
        { id: 'v1', code: 'PLATFORM20', category: 'PLATFORM_DISCOUNT', discount_amount: 20000 },
        { id: 'v2', code: 'SHOP10', category: 'MERCHANT_DISCOUNT', discount_amount: 10000 },
        { id: 'v3', code: 'FREESHIP15', category: 'FREE_SHIPPING', discount_amount: 15000 },
        { id: 'v4', code: 'MOMO5', category: 'PAYMENT_DISCOUNT', discount_amount: 5000 },
      ];

      const subtotal = 100000;
      const shippingFee = 20000;
      const pointsDiscount = 10000;

      const result = calculateVoucherDiscounts(subtotal, shippingFee, pointsDiscount, vouchers);

      // Food discount = 20k + 10k + 5k = 35k
      assert.strictEqual(result.foodDiscount, 35000);
      // Effective food = 100k - 10k (points) - 35k = 55k
      assert.strictEqual(result.effectiveFoodTotal, 55000);
      // Shipping discount = 15k, Effective shipping = 20k - 15k = 5k
      assert.strictEqual(result.shippingDiscount, 15000);
      assert.strictEqual(result.effectiveShipping, 5000);
      // Final total = 55k + 5k = 60k
      assert.strictEqual(result.finalTotal, 60000);
    });

    it('2. Kiểm tra tính hợp lệ của tổ hợp 4 tầng khác nhau (Mutual Exclusion Pass)', () => {
      const vouchers: AppliedVoucher[] = [
        { id: 'v1', code: 'PLATFORM20', category: 'PLATFORM_DISCOUNT', discount_amount: 20000 },
        { id: 'v2', code: 'SHOP10', category: 'MERCHANT_DISCOUNT', discount_amount: 10000 },
        { id: 'v3', code: 'FREESHIP15', category: 'FREE_SHIPPING', discount_amount: 15000 },
      ];

      const validation = validateTierMutualExclusion(vouchers);
      assert.strictEqual(validation.isValid, true);
      assert.strictEqual(validation.duplicateCategory, undefined);
    });

    it('3. Đơn hàng đạt giá trị tối thiểu thỏa mãn điều kiện voucher', () => {
      const voucher: AppliedVoucher = {
        id: 'v1',
        code: 'PLATFORM50',
        category: 'PLATFORM_DISCOUNT',
        discount_amount: 50000,
        min_order_amount: 150000,
      };

      assert.strictEqual(isVoucherSubtotalEligible(voucher, 200000), true);
      assert.strictEqual(isVoucherSubtotalEligible(voucher, 150000), true);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (BIÊN & BẤT THƯỜNG)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('4. Khấu trừ giảm giá lớn hơn giá trị món ăn thì tiền món bị chặn ở mức 0 VND (không âm)', () => {
      const vouchers: AppliedVoucher[] = [
        { id: 'v1', code: 'BIGDISCOUNT', category: 'PLATFORM_DISCOUNT', discount_amount: 150000 },
      ];

      const subtotal = 80000;
      const shippingFee = 15000;
      const pointsDiscount = 0;

      const result = calculateVoucherDiscounts(subtotal, shippingFee, pointsDiscount, vouchers);

      assert.strictEqual(result.effectiveFoodTotal, 0);
      assert.strictEqual(result.finalTotal, 15000); // Còn lại tiền ship
    });

    it('5. Giảm phí ship lớn hơn phí vận chuyển thực tế thì phí ship về 0 VND và không bù trừ sang tiền món', () => {
      const vouchers: AppliedVoucher[] = [
        { id: 'v1', code: 'FREESHIPMAX', category: 'FREE_SHIPPING', discount_amount: 50000 },
      ];

      const subtotal = 100000;
      const shippingFee = 15000;
      const pointsDiscount = 0;

      const result = calculateVoucherDiscounts(subtotal, shippingFee, pointsDiscount, vouchers);

      assert.strictEqual(result.shippingDiscount, 15000);
      assert.strictEqual(result.effectiveShipping, 0);
      assert.strictEqual(result.effectiveFoodTotal, 100000);
      assert.strictEqual(result.finalTotal, 100000);
    });

    it('6. Voucher không có min_order_amount thì luôn thỏa mãn với mọi giỏ hàng', () => {
      const voucher: AppliedVoucher = {
        id: 'v1',
        code: 'NO_MIN',
        category: 'PLATFORM_DISCOUNT',
        discount_amount: 10000,
      };

      assert.strictEqual(isVoucherSubtotalEligible(voucher, 0), true);
      assert.strictEqual(isVoucherSubtotalEligible(voucher, 50000), true);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR / REJECTION FLOW (TỪ CHỐI)
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('7. Từ chối khi khách chọn 2 voucher thuộc cùng 1 tầng danh mục (Duplicate Tier Violation)', () => {
      const invalidVouchers: AppliedVoucher[] = [
        { id: 'v1', code: 'PLATFORM20', category: 'PLATFORM_DISCOUNT', discount_amount: 20000 },
        { id: 'v2', code: 'PLATFORM30', category: 'PLATFORM_DISCOUNT', discount_amount: 30000 },
      ];

      const validation = validateTierMutualExclusion(invalidVouchers);
      assert.strictEqual(validation.isValid, false);
      assert.strictEqual(validation.duplicateCategory, 'PLATFORM_DISCOUNT');
    });

    it('8. Từ chối khi giỏ hàng chưa đạt giá trị đơn tối thiểu min_order_amount', () => {
      const voucher: AppliedVoucher = {
        id: 'v1',
        code: 'PLATFORM50',
        category: 'PLATFORM_DISCOUNT',
        discount_amount: 50000,
        min_order_amount: 200000,
      };

      assert.strictEqual(isVoucherSubtotalEligible(voucher, 199999), false);
      assert.strictEqual(isVoucherSubtotalEligible(voucher, 0), false);
    });
  });
});
