/**
 * @file driver-tracking.spec.ts
 * @description Kiểm thử toàn diện dịch vụ định vị GPS tài xế, tính toán cự ly lộ trình và phát sóng WebSocket
 * @trace docs/plans/driver/driver-tracking-realtime-gps.md
 * @trace docs/services/driver-service.md
 * @scenarios
 *   - 🟢 Happy Path: Cập nhật vị trí GPS, tính khoảng cách, ước tính thời gian giao hàng, phát sóng room WebSocket
 *   - 🟡 Edge Cases: Tọa độ trùng nhau, thiếu tọa độ điểm giao, không có vị trí trong cache
 *   - 🔴 Error Flow: Đơn hàng không tìm thấy vị trí (NotFoundException), thiếu tham số orderId
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { TrackingService } from '@/modules/tracking/tracking.service.js';
import { TrackingGateway } from '@/modules/tracking/tracking.gateway.js';
import { TrackingController } from '@/modules/tracking/tracking.controller.js';
import type { DriverLocationRedisRepository, DriverLocationData } from '@/modules/tracking/repositories/driver-location.redis.repository.js';
import type { UpdateDriverLocationDto } from '@/modules/tracking/dto/update-location.dto.js';
import type { EstimateDistanceDto } from '@/modules/tracking/dto/estimate-distance.dto.js';

describe('Driver Tracking & Realtime GPS Engine', () => {
  let trackingService: TrackingService;
  let trackingGateway: TrackingGateway;
  let trackingController: TrackingController;
  let mockRedisRepo: {
    saveOrderDriverLocation: ReturnType<typeof vi.fn>;
    getOrderDriverLocation: ReturnType<typeof vi.fn>;
    saveDriverCurrentLocation: ReturnType<typeof vi.fn>;
    getDriverCurrentLocation: ReturnType<typeof vi.fn>;
  };
  let mockSocketServer: {
    to: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRedisRepo = {
      saveOrderDriverLocation: vi.fn().mockResolvedValue(undefined),
      getOrderDriverLocation: vi.fn(),
      saveDriverCurrentLocation: vi.fn().mockResolvedValue(undefined),
      getDriverCurrentLocation: vi.fn(),
    };

    mockSocketServer = {
      to: vi.fn().mockReturnValue({
        emit: vi.fn(),
      }),
    };

    const mockDispatchService = {
      acceptTrip: vi.fn(),
      rejectTrip: vi.fn(),
    };

    trackingService = new TrackingService(mockRedisRepo as unknown as DriverLocationRedisRepository);
    trackingGateway = new TrackingGateway(trackingService, mockDispatchService as any);
    trackingGateway.server = mockSocketServer as any;

    trackingController = new TrackingController(trackingService, trackingGateway);
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Cập nhật vị trí GPS tài xế, tính cự ly còn lại và thời gian ETA chính xác', async () => {
      const dto: UpdateDriverLocationDto = {
        orderId: 'ord-123',
        driverId: 'drv-456',
        lat: 10.772545,
        lng: 106.702758,
        heading: 90,
        speed: 30,
        dropoff_lat: 10.77653,
        dropoff_lng: 106.70098,
      };

      const result = await trackingService.updateLocation(dto);

      expect(result).toBeDefined();
      expect(result.orderId).toBe('ord-123');
      expect(result.driverId).toBe('drv-456');
      expect(result.lat).toBe(10.772545);
      expect(result.lng).toBe(106.702758);
      expect(result.remaining_km).toBeGreaterThan(0);
      expect(result.eta_minutes).toBeGreaterThan(0);
      expect(result.updatedAt).toBeDefined();

      expect(mockRedisRepo.saveOrderDriverLocation).toHaveBeenCalledWith('ord-123', result);
    });

    it('2. Lấy vị trí GPS hiện tại của đơn hàng từ Redis thành công', async () => {
      const storedData: DriverLocationData = {
        orderId: 'ord-123',
        driverId: 'drv-456',
        lat: 10.773,
        lng: 106.702,
        remaining_km: 1.2,
        eta_minutes: 3,
        updatedAt: new Date().toISOString(),
      };
      mockRedisRepo.getOrderDriverLocation.mockResolvedValue(storedData);

      const location = await trackingService.getLocationByOrderId('ord-123');
      expect(location).toEqual(storedData);
      expect(mockRedisRepo.getOrderDriverLocation).toHaveBeenCalledWith('ord-123');
    });

    it('3. Ước tính cự ly và thời gian di chuyển giữa 2 điểm GPS chuẩn xác', () => {
      const dto: EstimateDistanceDto = {
        origin_lat: 10.772545,
        origin_lng: 106.702758,
        destination_lat: 10.77653,
        destination_lng: 106.70098,
      };

      const estimation = trackingService.estimateDistance(dto);
      expect(estimation.distance_km).toBeGreaterThan(0);
      expect(estimation.estimated_duration_minutes).toBeGreaterThan(0);
    });

    it('4. Gateway broadcast vị trí GPS cho room đơn hàng khi nhận driver:update_location', async () => {
      const emitMock = vi.fn();
      mockSocketServer.to.mockReturnValue({ emit: emitMock });

      const dto: UpdateDriverLocationDto = {
        orderId: 'ord-123',
        driverId: 'drv-456',
        lat: 10.774,
        lng: 106.701,
      };

      const mockClient = { id: 'client-driver' } as any;
      const response = await trackingGateway.handleDriverUpdateLocation(mockClient, dto);

      expect(response).toEqual({ success: true, data: expect.any(Object) });
      expect(mockSocketServer.to).toHaveBeenCalledWith('order_ord-123');
      expect(emitMock).toHaveBeenCalledWith('driver:location_updated', expect.any(Object));
    });

    it('5. REST Controller cập nhật tọa độ GPS và phát tín hiệu broadcast', async () => {
      const broadcastSpy = vi.spyOn(trackingGateway, 'broadcastLocation');

      const dto: UpdateDriverLocationDto = {
        orderId: 'ord-123',
        driverId: 'drv-456',
        lat: 10.775,
        lng: 106.701,
      };

      const result = await trackingController.updateOrderLocation('ord-123', dto);

      expect(result).toBeDefined();
      expect(result.orderId).toBe('ord-123');
      expect(broadcastSpy).toHaveBeenCalledWith('ord-123', result);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (TRƯỜNG HỢP BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Cập nhật vị trí khi không truyền dropoff_lat / dropoff_lng -> remaining_km và eta_minutes là null', async () => {
      const dto: UpdateDriverLocationDto = {
        orderId: 'ord-no-dropoff',
        driverId: 'drv-456',
        lat: 10.772545,
        lng: 106.702758,
      };

      const result = await trackingService.updateLocation(dto);

      expect(result.remaining_km).toBeNull();
      expect(result.eta_minutes).toBeNull();
    });

    it('2. Tọa độ tài xế trùng khớp với điểm nhận hàng -> cự ly bằng 0 km, ETA bằng 1 phút', async () => {
      const dto: UpdateDriverLocationDto = {
        orderId: 'ord-arrived',
        driverId: 'drv-456',
        lat: 10.77653,
        lng: 106.70098,
        dropoff_lat: 10.77653,
        dropoff_lng: 106.70098,
      };

      const result = await trackingService.updateLocation(dto);

      expect(result.remaining_km).toBe(0);
      expect(result.eta_minutes).toBe(1);
    });

    it('3. Ước tính cự ly giữa 2 điểm tọa độ trùng nhau -> cự ly bằng 0 km, thời gian bằng 0 phút', () => {
      const dto: EstimateDistanceDto = {
        origin_lat: 10.772,
        origin_lng: 106.702,
        destination_lat: 10.772,
        destination_lng: 106.702,
      };

      const estimation = trackingService.estimateDistance(dto);
      expect(estimation.distance_km).toBe(0);
      expect(estimation.estimated_duration_minutes).toBe(0);
    });

    it('4. Khách hàng theo dõi đơn hàng chưa có tọa độ GPS nào trong cache -> join room thành công không lỗi', async () => {
      mockRedisRepo.getOrderDriverLocation.mockResolvedValue(null);

      const clientEmit = vi.fn();
      const mockClient = {
        id: 'client-customer-1',
        join: vi.fn().mockResolvedValue(undefined),
        emit: clientEmit,
      } as any;

      const result = await trackingGateway.handleOrderTrack(mockClient, { orderId: 'ord-empty' });

      expect(result).toEqual({ success: true, room: 'order_ord-empty' });
      expect(mockClient.join).toHaveBeenCalledWith('order_ord-empty');
      expect(clientEmit).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR FLOW (TỪ CHỐI & BẢO VỆ)
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('1. Truy vấn vị trí đơn hàng không tồn tại trong cache -> Ném lỗi NotFoundException', async () => {
      mockRedisRepo.getOrderDriverLocation.mockResolvedValue(null);

      await expect(trackingService.getLocationByOrderId('ord-non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('2. Gọi handleOrderTrack mà không truyền orderId -> Trả về lỗi yêu cầu orderId', async () => {
      const mockClient = { id: 'client-err', join: vi.fn() } as any;
      const res = await trackingGateway.handleOrderTrack(mockClient, { orderId: '' });

      expect(res).toEqual({ error: 'orderId is required' });
      expect(mockClient.join).not.toHaveBeenCalled();
    });

    it('3. Khi Redis gặp sự cố ghi dữ liệu -> Ném ngoại lệ có kiểm soát để bảo toàn root cause', async () => {
      mockRedisRepo.saveOrderDriverLocation.mockRejectedValue(new Error('Redis connection timeout'));

      const dto: UpdateDriverLocationDto = {
        orderId: 'ord-fail',
        driverId: 'drv-fail',
        lat: 10.772,
        lng: 106.702,
      };

      await expect(trackingService.updateLocation(dto)).rejects.toThrow('Redis connection timeout');
    });
  });
});
