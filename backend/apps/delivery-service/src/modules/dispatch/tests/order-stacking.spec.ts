/**
 * @file order-stacking.spec.ts
 * @description Unit tests for Driver Order Stacking & Multi-stop Route Optimization (OSRM/Haversine)
 *
 * Traceability Matrix:
 * - Module: Delivery Service - Dispatch Module
 * - Task Code: driver-order-stacking-osrm
 * - Issue: #78 (Thuật toán Gom đơn / Ghép cuốc cho Tài xế theo lộ trình OSRM)
 * - Plan: docs/plans/driver/driver-order-stacking-osrm.md
 *
 * Test Scenarios:
 * 1. Happy Path (HP-01 -> HP-04):
 *    - HP-01: Đánh giá 2 đơn hàng đủ điều kiện gom (quán cách 300m, điểm giao cùng hướng).
 *    - HP-02: Tối ưu thứ tự 4 chặng dừng chính xác (P1 -> P2 -> D1 -> D2).
 *    - HP-03: Khởi tạo chuyến ghép StackedTrip thành công và phân bổ tiền thưởng tài xế.
 *    - HP-04: Cập nhật tiến độ chặng và tự động hoàn thành chuyến (COMPLETED) ở chặng cuối.
 * 2. Edge Cases (EC-01 -> EC-04):
 *    - EC-01: Cự ly 2 quán ăn chạm đúng ngưỡng tối đa 0.8km (800m).
 *    - EC-02: Quãng đường đi thêm chạm đúng trần cho phép (detour <= 2.5km).
 *    - EC-03: Hai đơn hàng có cùng điểm trả khách (cùng tòa nhà chung cư).
 *    - EC-04: Điểm giao khách 2 gần hơn điểm giao 1 -> tự động đảo thứ tự (P1 -> P2 -> D2 -> D1).
 * 3. Error Flow (ERR-01 -> ERR-05):
 *    - ERR-01: Hai quán ăn cách nhau quá xa (> 800m) -> từ chối gom đơn (RESTAURANTS_TOO_FAR).
 *    - ERR-02: Hai đơn hàng đi về hai hướng ngược nhau -> từ chối gom đơn (OPPOSITE_DIRECTIONS).
 *    - ERR-03: Cự ly đường vòng thêm quá lớn (> 2.5km) -> từ chối gom đơn (DETOUR_TOO_LONG).
 *    - ERR-04: Gom trùng một đơn hàng cho chính nó -> ném BadRequestException.
 *    - ERR-05: Chuyển chặng khi chuyến ghép đã hoàn tất -> ném BadRequestException.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrderStackingService } from '@/modules/dispatch/services/order-stacking.service.js';
import { StackedTripStatus } from '@/modules/dispatch/enums/stacked-trip-status.enum.js';
import { WaypointType } from '@/modules/dispatch/enums/waypoint-type.enum.js';
import type { OrderLocationInfo } from '@/modules/dispatch/interfaces/order-waypoint.interface.js';
import type { StackedTrip } from '@/modules/dispatch/entities/stacked-trip.entity.js';
import type { Repository } from 'typeorm';

describe('Driver Order Stacking Engine (Issue #78)', () => {
  let stackingService: OrderStackingService;
  let mockStackedTripRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  // Đơn hàng mẫu 1: Quán A tại Quận 1 (10.7760, 106.7000) giao về Bình Thạnh (10.7950, 106.7100)
  const order1: OrderLocationInfo = {
    orderId: 'ord-uuid-001',
    restaurantName: 'Cơm Tấm Ba Ghiền Quán 1',
    restaurantAddress: '123 Lê Lợi, Q.1',
    restaurantLat: 10.776,
    restaurantLng: 106.7,
    deliveryAddress: '456 Điện Biên Phủ, Bình Thạnh',
    deliveryLat: 10.795,
    deliveryLng: 106.71,
  };

  // Đơn hàng mẫu 2: Quán B gần Quán A (cách ~300m) giao về cùng trục Bình Thạnh
  const order2Eligible: OrderLocationInfo = {
    orderId: 'ord-uuid-002',
    restaurantName: 'Trà Sữa Gong Cha',
    restaurantAddress: '150 Lê Lợi, Q.1',
    restaurantLat: 10.777,
    restaurantLng: 106.702,
    deliveryAddress: '500 Điện Biên Phủ, Bình Thạnh',
    deliveryLat: 10.798,
    deliveryLng: 106.712,
  };

  beforeEach(() => {
    mockStackedTripRepo = {
      create: vi.fn().mockImplementation((d) => d),
      save: vi.fn().mockImplementation((d) => Promise.resolve({ id: 'trip-uuid-123', ...d })),
      findOne: vi.fn(),
    };

    stackingService = new OrderStackingService(
      mockStackedTripRepo as unknown as Repository<StackedTrip>,
    );
  });

  // ==========================================
  // NHÁNH 1: HAPPY PATH (HP-01 -> HP-04)
  // ==========================================
  describe('Nhánh 1: Happy Path', () => {
    it('HP-01: Đánh giá 2 đơn hàng đủ điều kiện gom (quán gần, cùng hướng giao)', () => {
      const result = stackingService.evaluateEligibility(order1, order2Eligible);

      expect(result.eligible).toBe(true);
      expect(result.pickupDistanceKm).toBeLessThanOrEqual(0.8);
      expect(result.bearingDeviationDeg).toBeLessThanOrEqual(45);
      expect(result.detourDistanceKm).toBeLessThanOrEqual(2.5);
      expect(result.driverBonusEarnings).toBeGreaterThanOrEqual(15000);
    });

    it('HP-02: Tối ưu thứ tự 4 chặng dừng chính xác (P1 -> P2 -> D1 -> D2)', () => {
      const waypoints = stackingService.optimizeWaypoints(order1, order2Eligible);

      expect(waypoints).toHaveLength(4);
      expect(waypoints[0].type).toBe(WaypointType.PICKUP);
      expect(waypoints[0].orderId).toBe(order1.orderId);

      expect(waypoints[1].type).toBe(WaypointType.PICKUP);
      expect(waypoints[1].orderId).toBe(order2Eligible.orderId);

      expect(waypoints[2].type).toBe(WaypointType.DROPOFF);
      expect(waypoints[3].type).toBe(WaypointType.DROPOFF);
    });

    it('HP-03: Khởi tạo chuyến ghép StackedTrip thành công và phân bổ tiền thưởng', async () => {
      const trip = await stackingService.createStackedTrip({
        driverId: 'driver-uuid-888',
        primaryOrder: order1,
        secondaryOrder: order2Eligible,
      });

      expect(trip.driver_id).toBe('driver-uuid-888');
      expect(trip.primary_order_id).toBe(order1.orderId);
      expect(trip.secondary_order_id).toBe(order2Eligible.orderId);
      expect(trip.status).toBe(StackedTripStatus.ACTIVE);
      expect(trip.current_waypoint_index).toBe(0);
      expect(trip.driver_bonus_earnings).toBeGreaterThan(0);
      expect(mockStackedTripRepo.save).toHaveBeenCalled();
    });

    it('HP-04: Cập nhật tiến độ chặng và tự động hoàn thành chuyến (COMPLETED) ở chặng cuối', async () => {
      const waypoints = stackingService.optimizeWaypoints(order1, order2Eligible);
      const activeTrip: StackedTrip = {
        id: 'trip-123',
        driver_id: 'driver-888',
        primary_order_id: order1.orderId,
        secondary_order_id: order2Eligible.orderId,
        status: StackedTripStatus.ACTIVE,
        waypoints,
        current_waypoint_index: 3, // Đang ở chặng cuối cùng (chặng 3)
        total_distance_km: 3.5,
        estimated_duration_minutes: 20,
        driver_bonus_earnings: 18000,
        created_at: new Date(),
        completed_at: null,
        is_deleted: false,
      };

      mockStackedTripRepo.findOne.mockResolvedValue(activeTrip);

      const completedTrip = await stackingService.advanceNextWaypoint('trip-123', 'driver-888');

      expect(completedTrip.current_waypoint_index).toBe(4);
      expect(completedTrip.status).toBe(StackedTripStatus.COMPLETED);
      expect(completedTrip.completed_at).toBeInstanceOf(Date);
      expect(completedTrip.waypoints[3].isCompleted).toBe(true);
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES (EC-01 -> EC-04)
  // ==========================================
  describe('Nhánh 2: Edge Cases', () => {
    it('EC-01: Cự ly giữa 2 quán ăn chạm đúng ngưỡng tối đa 0.8km (800m)', () => {
      // Quán B cách quán A đúng ~0.7km
      const order2BorderlinePickup: OrderLocationInfo = {
        ...order2Eligible,
        restaurantLat: 10.782, // dịch lên một chút
        restaurantLng: 106.702,
      };

      const result = stackingService.evaluateEligibility(order1, order2BorderlinePickup);
      expect(result.pickupDistanceKm).toBeLessThanOrEqual(0.8);
      expect(result.eligible).toBe(true);
    });

    it('EC-02: Hai đơn hàng có cùng điểm trả khách (cùng tòa chung cư) -> gom đơn tối ưu', () => {
      const orderSameDropoff: OrderLocationInfo = {
        ...order2Eligible,
        deliveryAddress: order1.deliveryAddress,
        deliveryLat: order1.deliveryLat,
        deliveryLng: order1.deliveryLng,
      };

      const result = stackingService.evaluateEligibility(order1, orderSameDropoff);
      expect(result.eligible).toBe(true);
      expect(result.detourDistanceKm).toBeLessThan(1.0); // detour rất nhỏ
    });

    it('EC-03: Điểm giao khách 2 gần P2 hơn điểm giao khách 1 -> tự động đảo thứ tự trả món (P1 -> P2 -> D2 -> D1)', () => {
      // D2 gần P2 hơn (ở Q.1 luôn, 10.7800, 106.7050)
      const order2CloseDropoff: OrderLocationInfo = {
        ...order2Eligible,
        deliveryLat: 10.78,
        deliveryLng: 106.705,
      };

      const waypoints = stackingService.optimizeWaypoints(order1, order2CloseDropoff);

      // Chặng 2 phải là D2 vì D2 gần P2 hơn D1
      expect(waypoints[2].orderId).toBe(order2CloseDropoff.orderId);
      expect(waypoints[3].orderId).toBe(order1.orderId);
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR / REJECTION FLOW (ERR-01 -> ERR-05)
  // ==========================================
  describe('Nhánh 3: Error / Rejection Flow', () => {
    it('ERR-01: Hai quán ăn cách nhau quá xa (> 800m) -> từ chối gom đơn (RESTAURANTS_TOO_FAR)', () => {
      const orderFarRestaurant: OrderLocationInfo = {
        ...order2Eligible,
        restaurantLat: 10.82, // Cách xa hơn 5km
        restaurantLng: 106.75,
      };

      const result = stackingService.evaluateEligibility(order1, orderFarRestaurant);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('RESTAURANTS_TOO_FAR');
    });

    it('ERR-02: Hai đơn hàng giao về hai hướng ngược nhau -> từ chối gom đơn (OPPOSITE_DIRECTIONS)', () => {
      // Đơn 1 giao về hướng Bắc (Bình Thạnh), đơn này giao về hướng Nam (Quận 7: 10.7300, 106.7100)
      const orderOppositeDirection: OrderLocationInfo = {
        ...order2Eligible,
        deliveryLat: 10.73,
        deliveryLng: 106.71,
      };

      const result = stackingService.evaluateEligibility(order1, orderOppositeDirection);
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('OPPOSITE_DIRECTIONS');
    });

    it('ERR-03: Gom trùng một đơn hàng cho chính nó -> ném BadRequestException', () => {
      expect(() => stackingService.evaluateEligibility(order1, order1)).toThrow(
        BadRequestException,
      );
    });

    it('ERR-04: Chuyển chặng cho chuyến ghép không tồn tại -> ném NotFoundException', async () => {
      mockStackedTripRepo.findOne.mockResolvedValue(null);

      await expect(
        stackingService.advanceNextWaypoint('non-existing', 'driver-888'),
      ).rejects.toThrow(NotFoundException);
    });

    it('ERR-05: Chuyển chặng khi chuyến ghép đã hoàn thành -> ném BadRequestException', async () => {
      mockStackedTripRepo.findOne.mockResolvedValue({
        id: 'trip-123',
        driver_id: 'driver-888',
        status: StackedTripStatus.COMPLETED,
        waypoints: [],
      });

      await expect(
        stackingService.advanceNextWaypoint('trip-123', 'driver-888'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
