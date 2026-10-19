/**
 * @file order-distance-calculation.spec.ts
 * @description Kiểm thử thuật toán tính toán khoảng cách lộ trình (Haversine) và gắn nhãn cự ly cho cuốc xe của tài xế
 * @trace docs/services/order-service.md # /orders/driver/available & /orders/driver/trips
 * @trace docs/business/business-roadmap.md # Issue D2: Thuật toán chia cuốc (Order Routing)
 * @plan address_book_and_driver_distance_plan.md # 4.1 Automated Unit Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { calculateHaversineDistanceKm } from '@/common/utils/geo.utils.js';
import { GetAvailableDriverTripsUseCase } from '@/modules/orders/usecases/get-available-driver-trips.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';
import type { InflightOrderData } from '@/modules/orders/repositories/order.redis.repository.js';

describe('Order Distance Calculation & Driver Distance Badge', () => {
  describe('calculateHaversineDistanceKm', () => {
    it('🟢 Happy Path: should calculate accurate distance between 2 valid GPS coordinates', () => {
      // Tọa độ Phố đi bộ Nguyễn Huệ (10.772545, 106.702758) đến Chợ Bến Thành (10.7721, 106.6983)
      const distance = calculateHaversineDistanceKm(10.772545, 106.702758, 10.7721, 106.6983);
      // Khoảng cách thực tế ~0.5 km
      expect(distance).toBeGreaterThanOrEqual(0.4);
      expect(distance).toBeLessThanOrEqual(0.6);
    });

    it('🟡 Edge Case: should return 0 when both points have identical coordinates', () => {
      const distance = calculateHaversineDistanceKm(10.772545, 106.702758, 10.772545, 106.702758);
      expect(distance).toBe(0);
    });

    it('🟡 Edge Case: should return 0 when any coordinate is null, undefined, or NaN', () => {
      expect(calculateHaversineDistanceKm(null, 106.702758, 10.7721, 106.6983)).toBe(0);
      expect(calculateHaversineDistanceKm(10.772545, undefined, 10.7721, 106.6983)).toBe(0);
      expect(calculateHaversineDistanceKm(10.772545, 106.702758, NaN, 106.6983)).toBe(0);
    });
  });

  describe('GetAvailableDriverTripsUseCase Distance Badge', () => {
    let useCase: GetAvailableDriverTripsUseCase;
    let mockOrderRedisRepo: {
      getAvailablePickupOrders: ReturnType<typeof vi.fn>;
    };
    let mockConfigService: {
      getOrThrow: ReturnType<typeof vi.fn>;
    };

    const originalFetch = global.fetch;

    beforeEach(() => {
      mockOrderRedisRepo = {
        getAvailablePickupOrders: vi.fn(),
      };
      mockConfigService = {
        getOrThrow: vi.fn((key: string) => {
          if (key === 'services.userUrl') return 'http://localhost:3001';
          if (key === 'services.restaurantUrl') return 'http://localhost:3003';
          return '';
        }),
      };

      useCase = new GetAvailableDriverTripsUseCase(
        mockOrderRedisRepo as any,
        mockConfigService as any,
      );
    });

    afterEach(() => {
      global.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('🟢 Happy Path: should return calculated distance_km when order and restaurant have coordinates', async () => {
      const sampleOrder: InflightOrderData = {
        id: 'ord-123',
        customer_id: 'cust-1',
        restaurant_id: 'rest-1',
        driver_id: null,
        status: OrderStatus.READY_FOR_PICKUP,
        delivery_address: '72 Lê Thánh Tôn, Q1',
        delivery_lat: 10.77653,
        delivery_lng: 106.70098,
        recipient_name: 'Nguyễn Văn An',
        recipient_phone: '0901234567',
        note: null,
        payment_method: 'CASH',
        subtotal: 105000,
        delivery_fee: 15000,
        total_amount: 120000,
        items: [{ menu_item_id: 'item-1', name: 'Phở Đặc Biệt', quantity: 2, unit_price: 60000 }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockOrderRedisRepo.getAvailablePickupOrders.mockResolvedValue([sampleOrder]);

      // Mock restaurant service details endpoint
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/internal/restaurants/rest-1/details')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'rest-1',
              name: 'Phở Biên Hòa',
              address: '123 Nguyễn Huệ, Q1',
              lat: 10.772545,
              lon: 106.702758,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

      const trips = await useCase.execute();

      expect(trips).toHaveLength(1);
      const trip = trips[0];
      expect(trip.pickup_name).toBe('Phở Biên Hòa');
      expect(trip.pickup_lat).toBe(10.772545);
      expect(trip.pickup_lng).toBe(106.702758);
      expect(trip.dropoff_lat).toBe(10.77653);
      expect(trip.dropoff_lng).toBe(106.70098);
      expect(trip.recipient_name).toBe('Nguyễn Văn An');
      expect(trip.recipient_phone).toBe('0901234567');
      expect(trip.distance_km).toBeDefined();
      expect(trip.distance_km).toBeGreaterThan(0);
    });

    it('🟡 Edge Case: should return distance_km as null when order lacks delivery coordinates', async () => {
      const sampleOrder: InflightOrderData = {
        id: 'ord-legacy-1',
        customer_id: 'cust-1',
        restaurant_id: 'rest-1',
        driver_id: null,
        status: OrderStatus.READY_FOR_PICKUP,
        delivery_address: 'Địa chỉ cũ không có tọa độ',
        delivery_lat: null,
        delivery_lng: null,
        note: null,
        payment_method: 'CASH',
        subtotal: 35000,
        delivery_fee: 15000,
        total_amount: 50000,
        items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockOrderRedisRepo.getAvailablePickupOrders.mockResolvedValue([sampleOrder]);

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/internal/restaurants/rest-1/details')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: 'rest-1',
              name: 'Phở Biên Hòa',
              address: '123 Nguyễn Huệ, Q1',
              lat: 10.772545,
              lon: 106.702758,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });

      const trips = await useCase.execute();
      expect(trips).toHaveLength(1);
      expect(trips[0].distance_km).toBeNull();
      expect(trips[0].dropoff_lat).toBeNull();
      expect(trips[0].dropoff_lng).toBeNull();
    });
  });
});
