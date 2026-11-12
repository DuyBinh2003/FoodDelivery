/**
 * @file coordinate-interpolation.test.ts
 * @description Unit tests for Marker Coordinate Interpolation, Heading Angle and Dynamic ETA.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  interpolateCoordinate,
  calculateHeadingAngle,
  calculateDynamicEta,
  type CoordinatePair,
} from '../utils/coordinate-interpolation.utils.ts';

describe('Coordinate Interpolation & Smooth Tracking Suite (#83)', () => {
  const benThanh: CoordinatePair = [10.772545, 106.698024];
  const ducBa: CoordinatePair = [10.779784, 106.699018];

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Nội suy chính xác điểm giữa (fraction = 0.5) giữa 2 tọa độ GPS', () => {
      const midPoint = interpolateCoordinate(benThanh, ducBa, 0.5);

      const expectedLat = (benThanh[0] + ducBa[0]) / 2;
      const expectedLng = (benThanh[1] + ducBa[1]) / 2;

      assert.strictEqual(Math.abs(midPoint[0] - expectedLat) < 0.0001, true);
      assert.strictEqual(Math.abs(midPoint[1] - expectedLng) < 0.0001, true);
    });

    it('HP-02: Tính góc xoay (Heading Angle) hướng Đông (90°) và hướng Bắc (0°)', () => {
      const start: CoordinatePair = [0, 0];
      const north: CoordinatePair = [1, 0];
      const east: CoordinatePair = [0, 1];

      const northAngle = calculateHeadingAngle(start, north);
      assert.strictEqual(Math.abs(northAngle - 0) < 0.5, true);

      const eastAngle = calculateHeadingAngle(start, east);
      assert.strictEqual(Math.abs(eastAngle - 90) < 0.5, true);
    });

    it('HP-03: Tính thời gian ETA động chính xác theo cự ly và tốc độ trung bình', () => {
      // 5km với vận tốc 25 km/h -> 5 / 25 * 60 = 12 phút
      const eta = calculateDynamicEta(5.0, 25);
      assert.strictEqual(eta, 12);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: fraction = 0 trả về chính xác tọa độ điểm bắt đầu', () => {
      const point = interpolateCoordinate(benThanh, ducBa, 0);
      assert.deepStrictEqual(point, benThanh);
    });

    it('EC-02: fraction = 1 trả về chính xác tọa độ điểm kết thúc', () => {
      const point = interpolateCoordinate(benThanh, ducBa, 1);
      assert.deepStrictEqual(point, ducBa);
    });

    it('EC-03: fraction < 0 hoặc > 1 được tự động clamp trong khoảng [0, 1]', () => {
      const pointUnder = interpolateCoordinate(benThanh, ducBa, -0.5);
      assert.deepStrictEqual(pointUnder, benThanh);

      const pointOver = interpolateCoordinate(benThanh, ducBa, 1.5);
      assert.deepStrictEqual(pointOver, ducBa);
    });

    it('EC-04: Hai điểm trùng nhau trả về góc xoay 0° an toàn', () => {
      const angle = calculateHeadingAngle(benThanh, benThanh);
      assert.strictEqual(angle, 0);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Cự ly <= 0 trả về ETA = 0 phút', () => {
      assert.strictEqual(calculateDynamicEta(0, 25), 0);
      assert.strictEqual(calculateDynamicEta(-2, 25), 0);
    });

    it('ER-02: Vận tốc âm hoặc cực nhỏ tự động clamp ở mức tối thiểu 5 km/h và trả về tối thiểu 1 phút', () => {
      // 0.2km với vận tốc 0 -> clamp tốc độ 5km/h -> 0.2/5 * 60 = 2.4 phút -> 2 phút (tối thiểu 1 phút)
      const eta = calculateDynamicEta(0.2, 0);
      assert.strictEqual(eta >= 1, true);
    });
  });
});
