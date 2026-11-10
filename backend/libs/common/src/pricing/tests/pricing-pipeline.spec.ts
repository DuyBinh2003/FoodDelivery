/**
 * @file pricing-pipeline.spec.ts
 * @description Unit tests for Dynamic Surge Pricing Pipeline Engine and Rule Strategies.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PricingPipelineEngine } from '@/common/pricing/pricing-pipeline.engine.js';
import type { PricingContext } from '@/common/pricing/pricing-rules.js';

describe('Pricing Pipeline Engine Suite (#84)', () => {
  let engine: PricingPipelineEngine;

  beforeEach(() => {
    engine = new PricingPipelineEngine();
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Tính toán chính xác biểu phí cơ bản cự ly 1.5km trong điều kiện bình thường', async () => {
      const context: PricingContext = {
        items: [
          { menu_item_id: 'item-1', quantity: 2, unit_price: 35000 },
          { menu_item_id: 'item-2', quantity: 1, unit_price: 20000 },
        ],
        distanceKm: 1.5,
        activeOrdersInArea: 5,
        availableDriversInArea: 10,
        weatherCondition: 'CLEAR',
        requestHour: 14,
      };

      const breakdown = await engine.calculate(context);

      expect(breakdown.itemsSubtotal).toBe(90000); // 2*35k + 20k
      expect(breakdown.baseShippingFee).toBe(15000); // <= 2km
      expect(breakdown.surgeMultiplier).toBe(1.0); // demand ratio 0.5 <= 1.0
      expect(breakdown.surgeFee).toBe(0);
      expect(breakdown.weatherFee).toBe(0);
      expect(breakdown.nightFee).toBe(0);
      expect(breakdown.totalShippingFee).toBe(15000);
      expect(breakdown.totalAmount).toBe(105000); // 90k + 15k
    });

    it('HP-02: Kích hoạt hệ số Surge 1.5x khi tỷ lệ đơn/tài xế đạt 2.5', async () => {
      const context: PricingContext = {
        items: [{ menu_item_id: 'item-1', quantity: 1, unit_price: 50000 }],
        distanceKm: 2.0,
        activeOrdersInArea: 25,
        availableDriversInArea: 10, // ratio = 2.5 -> multiplier 1.5x
        weatherCondition: 'CLEAR',
        requestHour: 12,
      };

      const breakdown = await engine.calculate(context);

      expect(breakdown.baseShippingFee).toBe(15000);
      expect(breakdown.surgeMultiplier).toBe(1.5);
      expect(breakdown.surgeFee).toBe(7500); // 15k * 0.5
      expect(breakdown.totalShippingFee).toBe(22500);
      expect(breakdown.totalAmount).toBe(72500);
    });

    it('HP-03: Áp dụng cộng dồn phụ phí thời tiết mưa (10k) và phụ phí giao đêm (10k)', async () => {
      const context: PricingContext = {
        items: [{ menu_item_id: 'item-1', quantity: 1, unit_price: 40000 }],
        distanceKm: 2.0,
        activeOrdersInArea: 5,
        availableDriversInArea: 10,
        weatherCondition: 'RAIN',
        requestHour: 23, // 23h đêm -> night surcharge
      };

      const breakdown = await engine.calculate(context);

      expect(breakdown.baseShippingFee).toBe(15000);
      expect(breakdown.weatherFee).toBe(10000);
      expect(breakdown.nightFee).toBe(10000);
      expect(breakdown.totalShippingFee).toBe(35000); // 15k + 10k + 10k
      expect(breakdown.totalAmount).toBe(75000);
    });

    it('HP-04: Khấu trừ voucher giảm giá chính xác vào tổng thanh toán', async () => {
      const context: PricingContext = {
        items: [{ menu_item_id: 'item-1', quantity: 1, unit_price: 100000 }],
        distanceKm: 2.0,
        voucherDiscount: 20000,
        requestHour: 10,
      };

      const breakdown = await engine.calculate(context);

      expect(breakdown.itemsSubtotal).toBe(100000);
      expect(breakdown.discountAmount).toBe(20000);
      expect(breakdown.totalShippingFee).toBe(15000);
      expect(breakdown.totalAmount).toBe(95000); // (100k - 20k) + 15k
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Cự ly vượt quá 2km tính thêm 5.000đ mỗi km làm tròn lên', async () => {
      const context: PricingContext = {
        items: [{ menu_item_id: 'item-1', quantity: 1, unit_price: 50000 }],
        distanceKm: 4.2, // 2km cơ bản + 2.2km thêm -> làm tròn 3km thêm = 15k thêm
        requestHour: 10,
      };

      const breakdown = await engine.calculate(context);

      expect(breakdown.baseShippingFee).toBe(30000); // 15k + 3*5k
    });

    it('EC-02: Nhu cầu cực đại (ratio > 3.0) kích hoạt trần tối đa Surge Multiplier 2.0x', async () => {
      const context: PricingContext = {
        items: [{ menu_item_id: 'item-1', quantity: 1, unit_price: 50000 }],
        distanceKm: 2.0,
        activeOrdersInArea: 100,
        availableDriversInArea: 5, // ratio = 20.0 >> 3.0
        requestHour: 12,
      };

      const breakdown = await engine.calculate(context);

      expect(breakdown.surgeMultiplier).toBe(2.0); // Bị chặn ở trần 2.0x
      expect(breakdown.surgeFee).toBe(15000); // 15k * 1.0
      expect(breakdown.totalShippingFee).toBe(30000);
    });

    it('EC-03: Giỏ hàng rỗng (0 items) và khoảng cách 0km tính toán an toàn không crash', async () => {
      const context: PricingContext = {
        items: [],
        distanceKm: 0,
        requestHour: 12,
      };

      const breakdown = await engine.calculate(context);

      expect(breakdown.itemsSubtotal).toBe(0);
      expect(breakdown.baseShippingFee).toBe(15000);
      expect(breakdown.totalAmount).toBe(15000);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Graceful Fallback: Rule gặp ngoại lệ không làm sập toàn bộ pipeline tính giá', async () => {
      const failingRule = {
        name: 'FailingRule',
        evaluate: () => {
          throw new Error('External service timeout');
        },
      };

      engine.addRule(failingRule);

      const context: PricingContext = {
        items: [{ menu_item_id: 'item-1', quantity: 1, unit_price: 50000 }],
        distanceKm: 2.0,
        requestHour: 12,
      };

      // Vẫn hoàn thành và trả về breakdown với các rules còn lại
      const breakdown = await engine.calculate(context);
      expect(breakdown.itemsSubtotal).toBe(50000);
      expect(breakdown.totalShippingFee).toBe(15000);
      expect(breakdown.totalAmount).toBe(65000);
    });

    it('ER-02: Giảm giá voucher vượt quá tổng tiền món ăn tự động clamp về 0 không để âm tiền', async () => {
      const context: PricingContext = {
        items: [{ menu_item_id: 'item-1', quantity: 1, unit_price: 20000 }],
        distanceKm: 2.0,
        voucherDiscount: 50000, // Lớn hơn tiền món
        requestHour: 12,
      };

      const breakdown = await engine.calculate(context);

      // Tiền món giảm tối đa về 0, cộng 15k ship = 15k (không bao giờ âm tiền)
      expect(breakdown.totalAmount).toBe(15000);
    });
  });
});

