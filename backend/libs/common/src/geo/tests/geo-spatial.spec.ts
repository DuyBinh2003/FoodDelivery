/**
 * @file geo-spatial.spec.ts
 * @description Comprehensive unit tests for Haversine distance, Bearing azimuth, Anti-Spoofing and Weighted Matching.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  isValidCoordinate,
} from '@/common/geo/haversine.util.js';
import { calculateBearing } from '@/common/geo/bearing.util.js';
import {
  validateGpsPing,
  MAX_REASONABLE_SPEED_KMH,
} from '@/common/geo/anti-spoofing.util.js';
import {
  calculateCandidateScore,
  rankCandidatesByWeightedScore,
  type DriverCandidateMetrics,
} from '@/common/geo/weighted-matching.util.js';

describe('GeoSpatial Engine & Anti-Spoofing Suite (#83)', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Tính khoảng cách Haversine chuẩn xác giữa 2 điểm GPS tại TP.HCM', () => {
      // Chợ Bến Thành (10.772545, 106.698024) -> Nhà Thờ Đức Bà (10.779784, 106.699018)
      // Khoảng cách thực tế ~ 0.81 km
      const distance = calculateHaversineDistance(
        10.772545,
        106.698024,
        10.779784,
        106.699018,
      );

      expect(distance).toBeGreaterThan(0.79);
      expect(distance).toBeLessThan(0.85);
    });

    it('HP-02: Tính góc xoay (Bearing Azimuth) chính xác hướng Bắc và hướng Đông', () => {
      // Từ (0, 0) đi thẳng lên cực Bắc (10, 0) -> 0°
      const northBearing = calculateBearing(0, 0, 10, 0);
      expect(northBearing).toBeCloseTo(0, 1);

      // Từ (0, 0) đi thẳng sang Đông (0, 10) -> 90°
      const eastBearing = calculateBearing(0, 0, 0, 10);
      expect(eastBearing).toBeCloseTo(90, 1);
    });

    it('HP-03: Anti-spoofing chấp thuận di chuyển hợp lệ của xe máy trong đô thị (< 60 km/h)', () => {
      const now = Date.now();
      const prevPing = { lat: 10.772545, lng: 106.698024, timestamp: now - 3000 }; // 3s trước
      // Di chuyển 40 mét trong 3s ~ 48 km/h
      const currPing = { lat: 10.772905, lng: 106.698024, timestamp: now };

      const result = validateGpsPing(currPing, prevPing);

      expect(result.isValid).toBe(true);
      expect(result.speedKmh).toBeLessThan(MAX_REASONABLE_SPEED_KMH);
      expect(result.reason).toBeUndefined();
    });

    it('HP-04: Xếp hạng tài xế đa tiêu chí (Weighted Matching) ưu tiên khoảng cách gần và tỷ lệ nhận cuốc cao', () => {
      const candidates: DriverCandidateMetrics[] = [
        { driverId: 'd-far-high-acc', distanceKm: 4.0, acceptanceRate: 0.98, activeTrips: 0 },
        { driverId: 'd-near-high-acc', distanceKm: 0.8, acceptanceRate: 0.95, activeTrips: 0 },
        { driverId: 'd-near-low-acc', distanceKm: 0.9, acceptanceRate: 0.40, activeTrips: 1 },
      ];

      const ranked = rankCandidatesByWeightedScore(candidates);

      expect(ranked).toHaveLength(3);
      // d-near-high-acc phải xếp vị trí số 1 vì gần (0.8km) và acceptance rate cao (95%)
      expect(ranked[0].driverId).toBe('d-near-high-acc');
      expect(ranked[0].score).toBeLessThan(ranked[1].score);
      expect(ranked[1].score).toBeLessThan(ranked[2].score);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (GIÁ TRỊ BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Khoảng cách giữa 2 tọa độ trùng nhau là 0 km', () => {
      const distance = calculateHaversineDistance(10.772545, 106.698024, 10.772545, 106.698024);
      expect(distance).toBe(0);

      const bearing = calculateBearing(10.772545, 106.698024, 10.772545, 106.698024);
      expect(bearing).toBe(0);
    });

    it('EC-02: Điểm xuất phát và đích cắt qua kinh tuyến 180° / -180° chuẩn xác', () => {
      const dist = calculateHaversineDistance(0, 179.9, 0, -179.9);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(30); // ~22.2 km
    });

    it('EC-03: Ping đầu tiên khi chưa có lịch sử vị trí trước đó luôn hợp lệ', () => {
      const ping = { lat: 10.772545, lng: 106.698024 };
      const result = validateGpsPing(ping, null);
      expect(result.isValid).toBe(true);
    });

    it('EC-04: Xếp hạng tài xế với các trường tùy chọn bị khuyết tự động gán mặc định an toàn', () => {
      const candidate: DriverCandidateMetrics = {
        driverId: 'd-defaults',
        distanceKm: 2.0,
      };

      const score = calculateCandidateScore(candidate);
      expect(score).toBeGreaterThan(0);
      expect(Number.isFinite(score)).toBe(true);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Ném lỗi khi tọa độ latitude vượt ngoài [-90, 90] hoặc longitude vượt ngoài [-180, 180]', () => {
      expect(() => calculateHaversineDistance(95, 106, 10, 106)).toThrow(/Invalid coordinate/);
      expect(() => calculateHaversineDistance(10, 106, 10, -185)).toThrow(/Invalid coordinate/);
      expect(() => calculateBearing(NaN, 106, 10, 106)).toThrow(/Coordinates must be valid numbers/);
    });

    it('ER-02: Anti-spoofing phát hiện và chặn đứng cú nhảy cóc tọa độ siêu thanh (Teleportation > 500 km/h)', () => {
      const now = Date.now();
      // Điểm 1: TP.HCM
      const prevPing = { lat: 10.772545, lng: 106.698024, timestamp: now - 3000 };
      // Điểm 2: Hà Nội (cách ~1150 km chỉ sau 3 giây!)
      const currPing = { lat: 21.028511, lng: 105.854444, timestamp: now };

      const result = validateGpsPing(currPing, prevPing);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Tốc độ di chuyển bất thường');
      expect(result.speedKmh).toBeGreaterThan(1000);
    });

    it('ER-03: isValidCoordinate từ chối dữ liệu NaN, null hoặc undefined', () => {
      expect(isValidCoordinate(NaN, 106)).toBe(false);
      expect(isValidCoordinate(10, null as unknown as number)).toBe(false);
      expect(isValidCoordinate(undefined as unknown as number, 106)).toBe(false);
    });
  });
});
