/**
 * @file price-lock.test.ts
 * @description Unit tests for Checkout Price Lock countdown timer, price diff calculator and surge badges.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatCountdownTimer,
  getTimerWarningState,
  calculatePriceDiff,
  getSurgeReasonLabels,
  type PriceBreakdownInput,
} from '../utils/price-lock.utils.ts';

describe('Checkout Price Lock Suite (#84)', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Định dạng số giây còn lại thành chuỗi MM:SS chuẩn xác', () => {
      assert.strictEqual(formatCountdownTimer(300), '05:00');
      assert.strictEqual(formatCountdownTimer(299), '04:59');
      assert.strictEqual(formatCountdownTimer(65), '01:05');
      assert.strictEqual(formatCountdownTimer(9), '00:09');
    });

    it('HP-02: Trạng thái bình thường khi thời gian còn trên 60 giây', () => {
      const state = getTimerWarningState(180);
      assert.strictEqual(state.isExpiringSoon, false);
      assert.strictEqual(state.isExpired, false);
      assert.ok(state.colorClass.includes('amber'));
    });

    it('HP-03: Tính toán chênh lệch giá (Price Diff) khi phí ship tăng do phụ phí', () => {
      const oldQuote: PriceBreakdownInput = {
        itemsSubtotal: 100000,
        totalShippingFee: 15000,
        totalAmount: 115000,
      };
      const newQuote: PriceBreakdownInput = {
        itemsSubtotal: 100000,
        totalShippingFee: 25000, // Tăng 10k
        totalAmount: 125000,
      };

      const diff = calculatePriceDiff(oldQuote, newQuote);
      assert.strictEqual(diff.shippingFeeDiff, 10000);
      assert.strictEqual(diff.totalAmountDiff, 10000);
      assert.strictEqual(diff.isPriceIncreased, true);
      assert.strictEqual(diff.isPriceDecreased, false);
      assert.ok(diff.formattedDiffMessage.includes('tăng thêm 10.000đ'));
    });

    it('HP-04: Trích xuất các nhãn giải thích phụ phí (Surge Reason Labels) chính xác', () => {
      const breakdown: PriceBreakdownInput = {
        itemsSubtotal: 80000,
        totalShippingFee: 35000,
        totalAmount: 115000,
        surgeFee: 5000,
        weatherFee: 10000,
        nightFee: 5000,
      };

      const badges = getSurgeReasonLabels(breakdown);
      assert.strictEqual(badges.length, 3);
      assert.ok(badges.includes('⚡ Phụ phí giờ cao điểm'));
      assert.ok(badges.includes('🌧️ Phụ phí thời tiết xấu'));
      assert.ok(badges.includes('🌙 Phụ phí giao đêm'));
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Đúng tại mốc 60 giây kích hoạt trạng thái cảnh báo sắp hết hạn (isExpiringSoon)', () => {
      const state = getTimerWarningState(60);
      assert.strictEqual(state.isExpiringSoon, true);
      assert.strictEqual(state.isExpired, false);
      assert.ok(state.colorClass.includes('rose'));
      assert.ok(state.colorClass.includes('pulse'));
    });

    it('EC-02: Thời gian về 0 giây kích hoạt trạng thái hết hạn hoàn toàn (isExpired)', () => {
      const state = getTimerWarningState(0);
      assert.strictEqual(state.isExpiringSoon, false);
      assert.strictEqual(state.isExpired, true);
      assert.strictEqual(formatCountdownTimer(0), '00:00');
    });

    it('EC-03: So sánh hai báo giá có cùng tổng tiền trả về trạng thái isUnchanged', () => {
      const quote: PriceBreakdownInput = {
        itemsSubtotal: 50000,
        totalShippingFee: 15000,
        totalAmount: 65000,
      };
      const diff = calculatePriceDiff(quote, quote);
      assert.strictEqual(diff.isUnchanged, true);
      assert.strictEqual(diff.totalAmountDiff, 0);
      assert.strictEqual(diff.formattedDiffMessage, 'Giá giữ nguyên không đổi.');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Thời gian âm (do chênh lệch đồng hồ client) tự động kẹp về 00:00 và báo expired', () => {
      assert.strictEqual(formatCountdownTimer(-15), '00:00');
      const state = getTimerWarningState(-5);
      assert.strictEqual(state.isExpired, true);
    });

    it('ER-02: Không có phụ phí nào (mọi fee = 0) trả về danh sách badges rỗng', () => {
      const breakdown: PriceBreakdownInput = {
        itemsSubtotal: 50000,
        totalShippingFee: 15000,
        totalAmount: 65000,
        surgeFee: 0,
        weatherFee: 0,
        nightFee: 0,
      };

      const badges = getSurgeReasonLabels(breakdown);
      assert.strictEqual(badges.length, 0);
    });
  });
});

