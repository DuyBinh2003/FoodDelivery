/**
 * @file dynamic-dispatch.spec.ts
 * @description Unit tests for Dynamic Radius Expansion, Heartbeat Ghost Eviction and Anti-Spoofing.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DispatchService, type DispatchOrderInput } from '@/modules/dispatch/dispatch.service.js';
import type { DriverGeoRedisRepository } from '@/modules/dispatch/repositories/driver-geo.redis.repository.js';
import type { TrackingGateway } from '@/modules/tracking/tracking.gateway.js';
import type { ConfigService } from '@nestjs/config';

describe('Dynamic Radius Expansion & Anti-Spoofing Suite (#83)', () => {
  let dispatchService: DispatchService;
  let mockDriverGeoRepo: Partial<DriverGeoRedisRepository>;
  let mockTrackingGateway: Partial<TrackingGateway>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockDriverGeoRepo = {
      updateDriverLocation: vi.fn().mockResolvedValue(undefined),
      removeDriverFromGeo: vi.fn().mockResolvedValue(undefined),
      findNearbyDrivers: vi.fn(),
      createDispatchSession: vi.fn(),
      getDispatchSession: vi.fn(),
      recordRejectionAndAdvance: vi.fn(),
      acceptDispatchSession: vi.fn(),
      clearDispatchSession: vi.fn().mockResolvedValue(undefined),
      isDriverHeartbeatActive: vi.fn().mockResolvedValue(true),
      evictGhostDrivers: vi.fn().mockResolvedValue([]),
    };

    mockTrackingGateway = {
      sendTripOffer: vi.fn(),
      cancelTripOffer: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3004'),
    };

    dispatchService = new DispatchService(
      mockDriverGeoRepo as DriverGeoRedisRepository,
      mockTrackingGateway as TrackingGateway,
      mockConfigService as ConfigService,
    );
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Tìm thấy tài xế ngay tại bán kính đầu tiên (3km) mà không cần mở rộng bán kính', async () => {
      const candidatesAt3km = [
        { driverId: 'driver-near-1', distanceKm: 1.2 },
        { driverId: 'driver-near-2', distanceKm: 2.4 },
      ];

      (mockDriverGeoRepo.findNearbyDrivers as ReturnType<typeof vi.fn>).mockResolvedValue(candidatesAt3km);
      (mockDriverGeoRepo.createDispatchSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        orderId: 'order-3km',
        candidates: ['driver-near-1', 'driver-near-2'],
        rejected: [],
        currentCandidate: 'driver-near-1',
        expiresAt: Date.now() + 15000,
        status: 'OFFERED',
      });

      const orderInput: DispatchOrderInput = {
        orderId: 'order-3km',
        restaurantLat: 10.772545,
        restaurantLng: 106.698024,
      };

      const result = await dispatchService.dispatchOrder(orderInput);

      expect(result.dispatched).toBe(true);
      expect(result.candidateCount).toBe(2);
      expect(result.selectedDriverId).toBe('driver-near-1');
      // Chỉ gọi findNearbyDrivers 1 lần với bán kính 3km
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenCalledTimes(1);
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenCalledWith(
        10.772545,
        106.698024,
        3,
      );
      expect(mockTrackingGateway.sendTripOffer).toHaveBeenCalledWith(
        'driver-near-1',
        expect.objectContaining({ orderId: 'order-3km' }),
      );
    });

    it('HP-02: Cập nhật vị trí tài xế hợp lệ nhiều lần thành công (Anti-spoofing passed)', async () => {
      const driverId = 'driver-normal';

      // Ping 1
      const res1 = await dispatchService.updateDriverLocation({
        driver_id: driverId,
        lat: 10.772545,
        lng: 106.698024,
      });
      expect(res1.success).toBe(true);

      // Ping 2: di chuyển 10 mét
      const res2 = await dispatchService.updateDriverLocation({
        driver_id: driverId,
        lat: 10.772635,
        lng: 106.698024,
      });
      expect(res2.success).toBe(true);
      expect(mockDriverGeoRepo.updateDriverLocation).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Dynamic Radius Expansion: Bán kính 3km rỗng, tự động mở rộng sang 5km và tìm thấy tài xế', async () => {
      const candidatesAt5km = [{ driverId: 'driver-mid-1', distanceKm: 4.2 }];

      // Lần 1 (3km) rỗng, lần 2 (5km) có tài xế
      (mockDriverGeoRepo.findNearbyDrivers as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(candidatesAt5km);

      (mockDriverGeoRepo.createDispatchSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        orderId: 'order-expand-5km',
        candidates: ['driver-mid-1'],
        rejected: [],
        currentCandidate: 'driver-mid-1',
        expiresAt: Date.now() + 15000,
        status: 'OFFERED',
      });

      const result = await dispatchService.dispatchOrder({ orderId: 'order-expand-5km' });

      expect(result.dispatched).toBe(true);
      expect(result.candidateCount).toBe(1);
      expect(result.selectedDriverId).toBe('driver-mid-1');
      // Đã gọi 2 lần: 3km rồi tới 5km
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenCalledTimes(2);
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenNthCalledWith(1, expect.any(Number), expect.any(Number), 3);
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenNthCalledWith(2, expect.any(Number), expect.any(Number), 5);
    });

    it('EC-02: Dynamic Radius Expansion: Mở rộng tiếp sang 7km khi cả 3km và 5km đều rỗng', async () => {
      const candidatesAt7km = [{ driverId: 'driver-far-1', distanceKm: 6.5 }];

      (mockDriverGeoRepo.findNearbyDrivers as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(candidatesAt7km);

      (mockDriverGeoRepo.createDispatchSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        orderId: 'order-expand-7km',
        candidates: ['driver-far-1'],
        rejected: [],
        currentCandidate: 'driver-far-1',
        expiresAt: Date.now() + 15000,
        status: 'OFFERED',
      });

      const result = await dispatchService.dispatchOrder({ orderId: 'order-expand-7km' });

      expect(result.dispatched).toBe(true);
      expect(result.candidateCount).toBe(1);
      expect(result.selectedDriverId).toBe('driver-far-1');
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenCalledTimes(3);
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenNthCalledWith(3, expect.any(Number), expect.any(Number), 7);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Quét hết mọi bán kính [3, 5, 7]km mà không có tài xế -> Trả về dispatched: false', async () => {
      (mockDriverGeoRepo.findNearbyDrivers as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await dispatchService.dispatchOrder({ orderId: 'order-no-one' });

      expect(result.dispatched).toBe(false);
      expect(result.candidateCount).toBe(0);
      expect(mockTrackingGateway.sendTripOffer).not.toHaveBeenCalled();
      expect(mockDriverGeoRepo.findNearbyDrivers).toHaveBeenCalledTimes(3);
    });

    it('ER-02: Anti-spoofing phát hiện cú nhảy cóc bất thường của tài xế và ném BadRequestException', async () => {
      const driverId = 'driver-spoofer';

      // Ping 1 tại TP.HCM
      await dispatchService.updateDriverLocation({
        driver_id: driverId,
        lat: 10.772545,
        lng: 106.698024,
      });

      // Ping 2 nhảy cóc ngay lập tức ra Hà Nội (cách >1000km)
      await expect(
        dispatchService.updateDriverLocation({
          driver_id: driverId,
          lat: 21.028511,
          lng: 105.854444,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

