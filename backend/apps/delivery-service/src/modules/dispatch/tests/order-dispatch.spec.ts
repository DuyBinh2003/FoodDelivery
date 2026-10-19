/**
 * @file order-dispatch.spec.ts
 * @description Unit tests for order routing and auto-dispatch engine with Redis Geospatial and 15s countdown
 * @traceability
 * - Plan: docs/plans/driver/driver-order-routing-dispatch.md
 * - Features: docs/features/driver/realtime-gps-tracking.md
 * - Target: backend/apps/delivery-service/src/modules/dispatch/dispatch.service.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { DispatchService, DispatchOrderInput } from '@/modules/dispatch/dispatch.service.js';
import { DriverGeoRedisRepository } from '@/modules/dispatch/repositories/driver-geo.redis.repository.js';
import { TrackingGateway } from '@/modules/tracking/tracking.gateway.js';
import { ConfigService } from '@nestjs/config';
import { DriverOnlineStatus } from '@/modules/dispatch/dto/update-driver-status.dto.js';

describe('Order Routing & Auto-Dispatch Suite (Issue #29)', () => {
  let dispatchService: DispatchService;
  let driverGeoRepo: DriverGeoRedisRepository;
  let trackingGateway: TrackingGateway;
  let configService: ConfigService;

  beforeEach(() => {
    vi.useFakeTimers();

    driverGeoRepo = {
      updateDriverLocation: vi.fn().mockResolvedValue(undefined),
      removeDriverFromGeo: vi.fn().mockResolvedValue(undefined),
      findNearbyDrivers: vi.fn(),
      createDispatchSession: vi.fn(),
      getDispatchSession: vi.fn(),
      recordRejectionAndAdvance: vi.fn(),
      acceptDispatchSession: vi.fn(),
      clearDispatchSession: vi.fn().mockResolvedValue(undefined),
    } as unknown as DriverGeoRedisRepository;

    trackingGateway = {
      sendTripOffer: vi.fn(),
      cancelTripOffer: vi.fn(),
    } as unknown as TrackingGateway;

    configService = {
      get: vi.fn().mockReturnValue('http://localhost:3004'),
    } as unknown as ConfigService;

    dispatchService = new DispatchService(driverGeoRepo, trackingGateway, configService);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Cập nhật vị trí tài xế GPS vào Redis Geo thành công', async () => {
      const res = await dispatchService.updateDriverLocation({
        driver_id: 'driver-uuid-1',
        lat: 10.7725,
        lng: 106.7027,
      });

      expect(res.success).toBe(true);
      expect(driverGeoRepo.updateDriverLocation).toHaveBeenCalledWith('driver-uuid-1', 10.7725, 106.7027);
    });

    it('2. Tìm kiếm và tự động bắn cuốc tới tài xế gần nhất trong bán kính 5km', async () => {
      const mockNearby = [
        { driverId: 'driver-1', distanceKm: 0.8 },
        { driverId: 'driver-2', distanceKm: 2.1 },
      ];
      vi.mocked(driverGeoRepo.findNearbyDrivers).mockResolvedValue(mockNearby);
      vi.mocked(driverGeoRepo.createDispatchSession).mockResolvedValue({
        orderId: 'order-123',
        candidates: ['driver-1', 'driver-2'],
        rejected: [],
        currentCandidate: 'driver-1',
        expiresAt: Date.now() + 15000,
        status: 'OFFERED',
      });

      const orderInput: DispatchOrderInput = {
        orderId: 'order-123',
        restaurantName: 'Phở 24',
        restaurantLat: 10.7725,
        restaurantLng: 106.7027,
        deliveryFee: 20000,
        driverEarnings: 18000,
      };

      const result = await dispatchService.dispatchOrder(orderInput);

      expect(result.dispatched).toBe(true);
      expect(result.candidateCount).toBe(2);
      expect(result.selectedDriverId).toBe('driver-1');

      // Kiểm tra gateway đã bắn offer tới driver-1
      expect(trackingGateway.sendTripOffer).toHaveBeenCalledWith(
        'driver-1',
        expect.objectContaining({
          orderId: 'order-123',
          timeoutSeconds: 15,
          driverEarnings: 18000,
        }),
      );
    });

    it('3. Tài xế chấp nhận cuốc xe trong thời hạn 15s thành công', async () => {
      vi.mocked(driverGeoRepo.acceptDispatchSession).mockResolvedValue(true);

      const res = await dispatchService.acceptTrip('order-123', 'driver-1');

      expect(res.success).toBe(true);
      expect(res.orderId).toBe('order-123');
      expect(res.driverId).toBe('driver-1');
      expect(driverGeoRepo.clearDispatchSession).toHaveBeenCalledWith('order-123');
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (GIÁ TRỊ BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Chuyển sang OFFLINE -> Xóa tài xế khỏi Redis Geo', async () => {
      const res = await dispatchService.updateDriverStatus({
        driver_id: 'driver-1',
        status: DriverOnlineStatus.OFFLINE,
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('OFFLINE');
      expect(driverGeoRepo.removeDriverFromGeo).toHaveBeenCalledWith('driver-1');
    });

    it('2. Không có tài xế nào trong bán kính 5km -> Trả về dispatched: false', async () => {
      vi.mocked(driverGeoRepo.findNearbyDrivers).mockResolvedValue([]);

      const result = await dispatchService.dispatchOrder({
        orderId: 'order-no-driver',
      });

      expect(result.dispatched).toBe(false);
      expect(result.candidateCount).toBe(0);
      expect(trackingGateway.sendTripOffer).not.toHaveBeenCalled();
    });

    it('3. Tài xế nhận cuốc khi phiên đã hết hạn hoặc đã được người khác nhận -> Báo lỗi BadRequestException', async () => {
      vi.mocked(driverGeoRepo.acceptDispatchSession).mockResolvedValue(false);

      await expect(dispatchService.acceptTrip('order-123', 'driver-late')).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & FAILOVER (CHUYỂN TIẾP CUỐC XE)
  // ==========================================
  describe('🔴 Error & Failover Flow', () => {
    it('1. Tài xế 1 chủ động từ chối (Reject) -> Tự động chuyển cuốc sang Tài xế 2', async () => {
      vi.mocked(driverGeoRepo.recordRejectionAndAdvance).mockResolvedValue({
        nextDriverId: 'driver-2',
        isExhausted: false,
      });

      // Giả lập đã có order trong cache
      const orderInput: DispatchOrderInput = {
        orderId: 'order-123',
        restaurantName: 'Cơm Tấm Cali',
      };
      vi.mocked(driverGeoRepo.findNearbyDrivers).mockResolvedValue([
        { driverId: 'driver-1', distanceKm: 1.0 },
        { driverId: 'driver-2', distanceKm: 2.0 },
      ]);
      vi.mocked(driverGeoRepo.createDispatchSession).mockResolvedValue({
        orderId: 'order-123',
        candidates: ['driver-1', 'driver-2'],
        rejected: [],
        currentCandidate: 'driver-1',
        expiresAt: Date.now() + 15000,
        status: 'OFFERED',
      });

      await dispatchService.dispatchOrder(orderInput);

      // Driver 1 bấm từ chối
      const rejectRes = await dispatchService.rejectTrip('order-123', 'driver-1', 'Đang bận ăn trưa');

      expect(rejectRes.success).toBe(true);
      expect(rejectRes.nextDriverId).toBe('driver-2');
      expect(trackingGateway.cancelTripOffer).toHaveBeenCalledWith('driver-1', 'order-123');

      // Kiểm tra offer mới đã bắn tới driver-2
      expect(trackingGateway.sendTripOffer).toHaveBeenCalledWith(
        'driver-2',
        expect.objectContaining({ orderId: 'order-123' }),
      );
    });

    it('2. Tài xế 1 không phản hồi (Hết 15 giây Timeout) -> Kích hoạt timer tự động chuyển sang Tài xế 2', async () => {
      vi.mocked(driverGeoRepo.findNearbyDrivers).mockResolvedValue([
        { driverId: 'driver-1', distanceKm: 1.0 },
        { driverId: 'driver-2', distanceKm: 2.0 },
      ]);
      vi.mocked(driverGeoRepo.createDispatchSession).mockResolvedValue({
        orderId: 'order-timeout',
        candidates: ['driver-1', 'driver-2'],
        rejected: [],
        currentCandidate: 'driver-1',
        expiresAt: Date.now() + 15000,
        status: 'OFFERED',
      });
      vi.mocked(driverGeoRepo.recordRejectionAndAdvance).mockResolvedValue({
        nextDriverId: 'driver-2',
        isExhausted: false,
      });

      await dispatchService.dispatchOrder({ orderId: 'order-timeout' });

      // Tua nhanh thời gian 15.1 giây
      await vi.advanceTimersByTimeAsync(15100);

      expect(trackingGateway.cancelTripOffer).toHaveBeenCalledWith('driver-1', 'order-timeout');
      expect(driverGeoRepo.recordRejectionAndAdvance).toHaveBeenCalledWith('order-timeout', 'driver-1', 15);
      expect(trackingGateway.sendTripOffer).toHaveBeenCalledWith('driver-2', expect.anything());
    });

    it('3. Khi toàn bộ tài xế trong bán kính đều từ chối -> Phiên điều phối kết thúc an toàn (isExhausted: true)', async () => {
      vi.mocked(driverGeoRepo.recordRejectionAndAdvance).mockResolvedValue({
        nextDriverId: null,
        isExhausted: true,
      });

      const res = await dispatchService.rejectTrip('order-123', 'driver-final');

      expect(res.isExhausted).toBe(true);
      expect(res.nextDriverId).toBeNull();
      expect(driverGeoRepo.clearDispatchSession).toHaveBeenCalledWith('order-123');
    });
  });
});
