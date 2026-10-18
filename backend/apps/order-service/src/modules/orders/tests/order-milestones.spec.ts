/**
 * @file order-milestones.spec.ts
 * @description Kiểm thử việc ghi nhận và truy xuất mốc thời gian (Milestones) theo từng Actor (User Role) cho đơn hàng
 * @trace docs/services/order-service.md # /orders/driver/trips, /orders/:id, /orders/restaurant/:id
 * @trace docs/architecture/async-order-processing-flow.md # Milestones lifecycle & Redis-PostgreSQL persistence
 * @plan role_based_order_milestones_plan.md # Verification Plan
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetDriverTripsUseCase } from '@/modules/orders/usecases/get-driver-trips.usecase.js';
import { GetOrderUseCase } from '@/modules/orders/usecases/get-order.usecase.js';
import { GetRestaurantOrdersUseCase } from '@/modules/orders/usecases/get-restaurant-orders.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';
import type { InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';

describe('Order Milestones (Role-Based Tracking)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. GetDriverTripsUseCase
  // ==========================================
  describe('GetDriverTripsUseCase', () => {
    let useCase: GetDriverTripsUseCase;
    let mockOrderReadRepo: {
      findTripsByDriverId: ReturnType<typeof vi.fn>;
    };
    let mockOrderRedisRepo: {
      getDriverInflightOrders: ReturnType<typeof vi.fn>;
    };
    let mockConfigService: {
      getOrThrow: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockOrderReadRepo = {
        findTripsByDriverId: vi.fn(),
      };
      mockOrderRedisRepo = {
        getDriverInflightOrders: vi.fn(),
      };
      mockConfigService = {
        getOrThrow: vi.fn((key: string) => {
          if (key === 'services.restaurantUrl') return 'http://localhost:3003';
          if (key === 'services.userUrl') return 'http://localhost:3001';
          return '';
        }),
      };

      useCase = new GetDriverTripsUseCase(
        mockOrderReadRepo as unknown as any,
        mockOrderRedisRepo as unknown as any,
        mockConfigService as unknown as any,
      );
    });

    // 🟢 Happy Path: Đơn hoàn tất có đủ claimed_at và completed_at -> tính đúng duration_minutes
    it('Happy Path: should return claimed_at, completed_at, and accurate duration_minutes for completed trips', async () => {
      const claimedTime = '2026-10-18T10:00:00.000Z';
      const completedTime = '2026-10-18T10:25:00.000Z'; // 25 minutes

      mockOrderRedisRepo.getDriverInflightOrders.mockResolvedValue([]);
      mockOrderReadRepo.findTripsByDriverId.mockResolvedValue([
        {
          id: 'order-1',
          restaurant_id: 'rest-1',
          driver_id: 'driver-1',
          total_amount: 150000,
          status: OrderStatus.COMPLETED,
          delivery_address: '123 Le Loi, Q1',
          driver_claimed_at: new Date(claimedTime),
          completed_at: new Date(completedTime),
          created_at: new Date('2026-10-18T09:40:00.000Z'),
          updated_at: new Date(completedTime),
          items: [],
          review: null,
        },
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'Com Tam Cali', address: '123 Nguyen Trai' }),
      });

      const trips = await useCase.execute({ driverId: 'driver-1' });

      expect(trips).toHaveLength(1);
      expect(trips[0].claimed_at).toEqual(new Date(claimedTime));
      expect(trips[0].completed_at).toEqual(new Date(completedTime));
      expect(trips[0].duration_minutes).toBe(25);
      expect(trips[0].pickup_name).toBe('Com Tam Cali');
    });

    // 🟡 Edge Case 1: Đơn cũ không có driver_claimed_at -> fallback tính từ created_at
    it('Edge Case: should fallback to created_at when claimed_at is missing on legacy completed orders', async () => {
      const createdTime = '2026-10-18T10:00:00.000Z';
      const completedTime = '2026-10-18T10:15:00.000Z'; // 15 minutes difference

      mockOrderRedisRepo.getDriverInflightOrders.mockResolvedValue([]);
      mockOrderReadRepo.findTripsByDriverId.mockResolvedValue([
        {
          id: 'legacy-order-2',
          restaurant_id: 'rest-1',
          driver_id: 'driver-1',
          total_amount: 100000,
          status: OrderStatus.COMPLETED,
          delivery_address: '456 Tran Hung Dao',
          driver_claimed_at: null,
          completed_at: new Date(completedTime),
          created_at: new Date(createdTime),
          updated_at: new Date(completedTime),
          items: [],
          review: null,
        },
      ]);

      const trips = await useCase.execute({ driverId: 'driver-1' });

      expect(trips).toHaveLength(1);
      expect(trips[0].claimed_at).toBeNull();
      expect(trips[0].completed_at).toEqual(new Date(completedTime));
      expect(trips[0].duration_minutes).toBe(15);
    });

    // 🟡 Edge Case 2: Đơn đang giao (DELIVERING) -> duration_minutes là null
    it('Edge Case: should return duration_minutes as null for trips not completed yet', async () => {
      const claimedTime = '2026-10-18T10:00:00.000Z';

      const inflightOrder: InflightOrderData = {
        id: 'inflight-order-1',
        customer_id: 'cust-1',
        restaurant_id: 'rest-1',
        restaurant_name: 'Com Tam Cali',
        driver_id: 'driver-1',
        delivery_address: '789 Vo Van Kiet',
        note: null,
        payment_method: 'CASH',
        total_amount: 80000,
        status: OrderStatus.DELIVERING,
        items: [],
        driver_claimed_at: claimedTime,
        completed_at: null,
        created_at: '2026-10-18T09:50:00.000Z',
        updated_at: claimedTime,
      };

      mockOrderRedisRepo.getDriverInflightOrders.mockResolvedValue([inflightOrder]);
      mockOrderReadRepo.findTripsByDriverId.mockResolvedValue([]);

      const trips = await useCase.execute({ driverId: 'driver-1' });

      expect(trips).toHaveLength(1);
      expect(trips[0].claimed_at).toEqual(new Date(claimedTime));
      expect(trips[0].completed_at).toBeNull();
      expect(trips[0].duration_minutes).toBeNull();
    });

    // 🔴 Error / Fallback Flow: Lỗi fetch nhà hàng vẫn không làm sập flow của tài xế
    it('Error Flow: should gracefully fallback pickup_name when restaurant details fetch fails', async () => {
      mockOrderRedisRepo.getDriverInflightOrders.mockResolvedValue([]);
      mockOrderReadRepo.findTripsByDriverId.mockResolvedValue([
        {
          id: 'order-fail-rest',
          restaurant_id: 'rest-unknown',
          driver_id: 'driver-1',
          total_amount: 50000,
          status: OrderStatus.COMPLETED,
          delivery_address: '10 Hai Ba Trung',
          driver_claimed_at: new Date('2026-10-18T10:00:00.000Z'),
          completed_at: new Date('2026-10-18T10:10:00.000Z'),
          created_at: new Date('2026-10-18T09:50:00.000Z'),
          updated_at: new Date('2026-10-18T10:10:00.000Z'),
          items: [],
          review: null,
        },
      ]);

      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'));

      const trips = await useCase.execute({ driverId: 'driver-1' });

      expect(trips).toHaveLength(1);
      expect(trips[0].pickup_name).toBe('Nhà hàng Đối tác');
      expect(trips[0].duration_minutes).toBe(10);
    });
  });

  // ==========================================
  // 2. GetOrderUseCase
  // ==========================================
  describe('GetOrderUseCase', () => {
    let useCase: GetOrderUseCase;
    let mockOrderRedisRepo: {
      getInflightOrder: ReturnType<typeof vi.fn>;
    };
    let mockOrderReadRepo: {
      findById: ReturnType<typeof vi.fn>;
    };
    let mockConfigService: {
      getOrThrow: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockOrderRedisRepo = {
        getInflightOrder: vi.fn(),
      };
      mockOrderReadRepo = {
        findById: vi.fn(),
      };
      mockConfigService = {
        getOrThrow: vi.fn((key: string) => {
          if (key === 'services.restaurantUrl') return 'http://localhost:3003';
          if (key === 'services.userUrl') return 'http://localhost:3001';
          return '';
        }),
      };

      useCase = new GetOrderUseCase(
        mockOrderRedisRepo as unknown as any,
        mockOrderReadRepo as unknown as any,
        mockConfigService as unknown as any,
      );
    });

    // 🟢 Happy Path: Inflight order trả về đầy đủ các mốc thời gian luân chuyển
    it('Happy Path: should return all milestone dates for inflight order', async () => {
      const inflight: InflightOrderData = {
        id: 'ord-live-1',
        customer_id: 'cust-1',
        restaurant_id: 'rest-1',
        driver_id: 'driver-1',
        delivery_address: '99 Nguyen Hue',
        total_amount: 120000,
        status: OrderStatus.READY_FOR_PICKUP,
        items: [],
        cooking_at: '2026-10-18T10:05:00.000Z',
        ready_at: '2026-10-18T10:20:00.000Z',
        driver_claimed_at: null,
        completed_at: null,
        cancelled_at: null,
        created_at: '2026-10-18T10:00:00.000Z',
        updated_at: '2026-10-18T10:20:00.000Z',
      };

      mockOrderRedisRepo.getInflightOrder.mockResolvedValue(inflight);

      const result = await useCase.execute({ orderId: 'ord-live-1' });

      expect(result.id).toBe('ord-live-1');
      expect(result.cooking_at).toEqual(new Date('2026-10-18T10:05:00.000Z'));
      expect(result.ready_at).toEqual(new Date('2026-10-18T10:20:00.000Z'));
      expect(result.driver_claimed_at).toBeNull();
      expect(result.completed_at).toBeNull();
    });

    // 🔴 Error Flow: Đơn không tồn tại trong Redis và DB -> ném NotFoundException
    it('Error Flow: should throw NotFoundException when order is not found anywhere', async () => {
      mockOrderRedisRepo.getInflightOrder.mockResolvedValue(null);
      mockOrderReadRepo.findById.mockResolvedValue(null);

      await expect(useCase.execute({ orderId: 'non-existing-id' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================
  // 3. GetRestaurantOrdersUseCase
  // ==========================================
  describe('GetRestaurantOrdersUseCase', () => {
    let useCase: GetRestaurantOrdersUseCase;
    let mockOrderRedisRepo: {
      getRestaurantInflightOrders: ReturnType<typeof vi.fn>;
    };
    let mockOrderReadRepo: {
      findWithFilters: ReturnType<typeof vi.fn>;
    };
    let mockConfigService: {
      getOrThrow: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockOrderRedisRepo = {
        getRestaurantInflightOrders: vi.fn(),
      };
      mockOrderReadRepo = {
        findWithFilters: vi.fn(),
      };
      mockConfigService = {
        getOrThrow: vi.fn((key: string) => {
          if (key === 'services.restaurantUrl') return 'http://localhost:3003';
          return '';
        }),
      };

      useCase = new GetRestaurantOrdersUseCase(
        mockOrderRedisRepo as unknown as any,
        mockOrderReadRepo as unknown as any,
        mockConfigService as unknown as any,
      );
    });

    // 🟢 Happy Path: Trả về đơn bếp với cooking_at và ready_at
    it('Happy Path: should map cooking_at and ready_at for restaurant kitchen view', async () => {
      const cookingTime = '2026-10-18T11:00:00.000Z';
      const inflightOrders: InflightOrderData[] = [
        {
          id: 'kitchen-ord-1',
          customer_id: 'cust-1',
          restaurant_id: 'rest-kitchen',
          driver_id: null,
          total_amount: 95000,
          status: OrderStatus.COOKING,
          delivery_address: '12 Ton Duc Thang',
          note: 'Không cay',
          items: [],
          cooking_at: cookingTime,
          ready_at: null,
          created_at: '2026-10-18T10:55:00.000Z',
          updated_at: cookingTime,
        },
      ];

      mockOrderRedisRepo.getRestaurantInflightOrders.mockResolvedValue(inflightOrders);
      mockOrderReadRepo.findWithFilters.mockResolvedValue({ data: [], total: 0 });

      const orders = await useCase.execute({ restaurantId: 'rest-kitchen' });

      expect(orders).toHaveLength(1);
      expect(orders[0].cooking_at).toEqual(new Date(cookingTime));
      expect(orders[0].ready_at).toBeNull();
      expect(orders[0].status).toBe(OrderStatus.COOKING);
    });
  });
});
