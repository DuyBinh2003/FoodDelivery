/**
 * @file driver-tracking-map.test.ts
 * @description Kiểm thử tính toán cự ly địa lý, thời gian giao hàng dự kiến (ETA), góc xoay xe máy và sinh lộ trình GPS
 * @traceability
 *   - Plan: docs/plans/driver/driver-tracking-realtime-gps.md
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceKm,
  calculateEtaMinutes,
  calculateBearing,
  interpolateGpsRoute,
} from '../utils/geo-map.utils.ts';

describe('Driver Tracking Map & Geo Calculations', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Tính đúng khoảng cách giữa Phố đi bộ Nguyễn Huệ và Chợ Bến Thành (~0.5 km)', () => {
      const distance = calculateDistanceKm(10.772545, 106.702758, 10.7721, 106.6983);
      assert.ok(distance >= 0.4 && distance <= 0.6, `Distance should be ~0.5km, got ${distance}`);
    });

    it('2. Tính thời gian giao hàng ETA hợp lý dựa trên cự ly (ví dụ: 2.5 km với tốc độ 25 km/h -> 6 phút)', () => {
      const eta = calculateEtaMinutes(2.5, 25);
      assert.strictEqual(eta, 6);
    });

    it('3. Tính góc xoay la bàn (bearing) hợp lệ nằm trong dải [0, 360) độ', () => {
      const bearing = calculateBearing(10.772545, 106.702758, 10.77653, 106.70098);
      assert.ok(bearing >= 0 && bearing <= 360, `Bearing must be in [0, 360], got ${bearing}`);
    });

    it('4. Sinh danh sách tọa độ nội suy lộ trình đầy đủ các bước (steps = 10)', () => {
      const waypoints = interpolateGpsRoute(10.77, 106.7, 10.78, 106.71, 10);
      assert.strictEqual(waypoints.length, 11);
      assert.strictEqual(waypoints[0].step, 0);
      assert.strictEqual(waypoints[0].percent, 0);
      assert.strictEqual(waypoints[10].step, 10);
      assert.strictEqual(waypoints[10].percent, 100);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (TRƯỜNG HỢP BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Tọa độ hai điểm trùng nhau -> Cự ly trả về 0 km', () => {
      const distance = calculateDistanceKm(10.772545, 106.702758, 10.772545, 106.702758);
      assert.strictEqual(distance, 0);
    });

    it('2. Cự ly bằng 0 hoặc âm -> ETA trả về 1 phút (tài xế đã ở điểm giao)', () => {
      assert.strictEqual(calculateEtaMinutes(0), 1);
      assert.strictEqual(calculateEtaMinutes(-5), 1);
    });

    it('3. Khi steps nội suy <= 0 -> Trả về mảng chứa điểm xuất phát an toàn không lỗi', () => {
      const waypoints = interpolateGpsRoute(10.77, 106.7, 10.78, 106.71, 0);
      assert.strictEqual(waypoints.length, 1);
      assert.strictEqual(waypoints[0].step, 0);
      assert.strictEqual(waypoints[0].lat, 10.77);
    });

    it('4. Tham số tọa độ null hoặc undefined -> Cự ly trả về 0 an toàn không lỗi', () => {
      assert.strictEqual(calculateDistanceKm(null, 106.702, 10.772, 106.698), 0);
      assert.strictEqual(calculateDistanceKm(10.772, undefined, 10.772, 106.698), 0);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR FLOW (TỪ CHỐI & BẢO VỆ)
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('1. Tọa độ truyền vào là NaN -> Trả về 0 thay vì làm hỏng phép tính', () => {
      assert.strictEqual(calculateDistanceKm(NaN, 106.702, 10.772, 106.698), 0);
      assert.strictEqual(calculateDistanceKm(10.772, 106.702, NaN, 106.698), 0);
    });

    it('2. Tọa độ chuỗi không thể parse số -> Trả về 0 bảo vệ', () => {
      assert.strictEqual(calculateDistanceKm('invalid' as unknown as number, 106.702, 10.772, 106.698), 0);
    });
  });
});
