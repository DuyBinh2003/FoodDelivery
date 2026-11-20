/**
 * @file gps-accuracy.test.ts
 * @description Unit tests for Driver GPS Accuracy Evaluation & Badge Configuration.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getGpsAccuracyLevel,
  getGpsAccuracyBadgeConfig,
} from '../utils/gps-accuracy.utils.ts';

describe('Driver GPS Accuracy Suite (#83)', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Phân loại EXCELLENT khi độ chính xác < 15 mét kèm badge xanh lục', () => {
      const level = getGpsAccuracyLevel(8);
      assert.strictEqual(level, 'EXCELLENT');

      const config = getGpsAccuracyBadgeConfig(level);
      assert.strictEqual(config.isReliable, true);
      assert.ok(config.label.includes('GPS Mạnh'));
      assert.ok(config.colorClass.includes('emerald'));
    });

    it('HP-02: Phân loại MODERATE khi độ chính xác từ 15m đến 50m kèm badge vàng', () => {
      const level = getGpsAccuracyLevel(30);
      assert.strictEqual(level, 'MODERATE');

      const config = getGpsAccuracyBadgeConfig(level);
      assert.strictEqual(config.isReliable, true);
      assert.ok(config.label.includes('GPS Trung bình'));
      assert.ok(config.colorClass.includes('amber'));
    });

    it('HP-03: Phân loại POOR khi độ chính xác > 50m kèm badge cảnh báo đỏ', () => {
      const level = getGpsAccuracyLevel(85);
      assert.strictEqual(level, 'POOR');

      const config = getGpsAccuracyBadgeConfig(level);
      assert.strictEqual(config.isReliable, false);
      assert.ok(config.label.includes('GPS Yếu'));
      assert.ok(config.colorClass.includes('rose'));
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Đúng tại mốc biên 15.0m được phân loại là MODERATE', () => {
      const level = getGpsAccuracyLevel(15);
      assert.strictEqual(level, 'MODERATE');
    });

    it('EC-02: Đúng tại mốc biên 50.0m được phân loại là MODERATE', () => {
      const level = getGpsAccuracyLevel(50);
      assert.strictEqual(level, 'MODERATE');
    });

    it('EC-03: Giá trị ngay trên mốc 50m (50.1m) được phân loại là POOR', () => {
      const level = getGpsAccuracyLevel(50.1);
      assert.strictEqual(level, 'POOR');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Trả về UNAVAILABLE khi đầu vào là null, undefined hoặc NaN', () => {
      assert.strictEqual(getGpsAccuracyLevel(null), 'UNAVAILABLE');
      assert.strictEqual(getGpsAccuracyLevel(undefined), 'UNAVAILABLE');
      assert.strictEqual(getGpsAccuracyLevel(NaN), 'UNAVAILABLE');

      const config = getGpsAccuracyBadgeConfig('UNAVAILABLE');
      assert.strictEqual(config.isReliable, false);
      assert.ok(config.label.includes('Mất tín hiệu'));
    });

    it('ER-02: Trả về UNAVAILABLE khi giá trị độ chính xác <= 0 (vô lý)', () => {
      assert.strictEqual(getGpsAccuracyLevel(0), 'UNAVAILABLE');
      assert.strictEqual(getGpsAccuracyLevel(-10), 'UNAVAILABLE');
    });
  });
});
