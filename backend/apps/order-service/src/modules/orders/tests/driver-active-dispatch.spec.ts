import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { GetAvailableDriverTripsUseCase } from '@/modules/orders/usecases/get-available-driver-trips.usecase.js';
import { ClaimDriverTripUseCase } from '@/modules/orders/usecases/claim-driver-trip.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

describe('Driver Active Status Check (Dispatch & Claim)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('GetAvailableDriverTripsUseCase', () => {
    let useCase: GetAvailableDriverTripsUseCase;
    let mockOrderRedisRepo: {
      getAvailablePickupOrders: ReturnType<typeof vi.fn>;
    };
    let mockConfigService: {
      getOrThrow: ReturnType<typeof vi.fn>;
    };

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
        mockOrderRedisRepo as unknown as any,
        mockConfigService as unknown as any,
      );
    });

    it('should return empty list [] when driver status is OFFLINE (inactive)', async () => {
      // Mock user-service returning OFFLINE driver status
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_driver: true,
          is_active: false,
          status: 'OFFLINE',
          verification_status: 'APPROVED',
        }),
      });

      const trips = await useCase.execute('driver-uuid-1');

      expect(trips).toEqual([]);
      expect(mockOrderRedisRepo.getAvailablePickupOrders).not.toHaveBeenCalled();
    });

    it('should return empty list [] when driver verification is PENDING / not approved', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_driver: true,
          is_active: false,
          status: 'ONLINE',
          verification_status: 'PENDING',
        }),
      });

      const trips = await useCase.execute('driver-uuid-2');

      expect(trips).toEqual([]);
      expect(mockOrderRedisRepo.getAvailablePickupOrders).not.toHaveBeenCalled();
    });

    it('should return empty list [] if user-service connection fails (fail-closed security)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const trips = await useCase.execute('driver-uuid-3');

      expect(trips).toEqual([]);
      expect(mockOrderRedisRepo.getAvailablePickupOrders).not.toHaveBeenCalled();
    });

    it('should return available trips when driver is ONLINE and APPROVED', async () => {
      // First fetch: user-service status check
      // Second fetch: restaurant details check
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/internal/drivers/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              is_driver: true,
              is_active: true,
              status: 'ONLINE',
              verification_status: 'APPROVED',
            }),
          });
        }
        if (url.includes('/internal/restaurants/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              name: 'Cơm Tấm Ba Ghiền',
              address: '84 Đặng Văn Ngữ, Phú Nhuận',
            }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      mockOrderRedisRepo.getAvailablePickupOrders.mockResolvedValue([
        {
          id: 'order-1',
          restaurant_id: 'rest-1',
          customer_id: 'cust-1',
          status: OrderStatus.READY_FOR_PICKUP,
          total_amount: 150000,
          delivery_address: '123 Nguyễn Trãi, Q1',
          items: [{ menu_item_id: 'item-1', name: 'Cơm sườn', quantity: 2, unit_price: 75000 }],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      const trips = await useCase.execute('active-driver-uuid');

      expect(trips.length).toBe(1);
      expect(trips[0].order_id).toBe('order-1');
      expect(trips[0].pickup_name).toBe('Cơm Tấm Ba Ghiền');
      expect(mockOrderRedisRepo.getAvailablePickupOrders).toHaveBeenCalled();
    });
  });

  describe('ClaimDriverTripUseCase', () => {
    let useCase: ClaimDriverTripUseCase;
    let mockOrderRedisRepo: {
      claimOrder: ReturnType<typeof vi.fn>;
    };
    let mockSqsService: {
      publishEvent: ReturnType<typeof vi.fn>;
    };
    let mockConfigService: {
      getOrThrow: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockOrderRedisRepo = {
        claimOrder: vi.fn(),
      };
      mockSqsService = {
        publishEvent: vi.fn(),
      };
      mockConfigService = {
        getOrThrow: vi.fn((key: string) => {
          if (key === 'services.userUrl') return 'http://localhost:3001';
          return '';
        }),
      };

      useCase = new ClaimDriverTripUseCase(
        mockOrderRedisRepo as unknown as any,
        mockSqsService as unknown as any,
        mockConfigService as unknown as any,
      );
    });

    it('should throw ForbiddenException if driver is OFFLINE when attempting to claim order', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_driver: true,
          is_active: false,
          status: 'OFFLINE',
          verification_status: 'APPROVED',
        }),
      });

      await expect(
        useCase.execute({ orderId: 'order-1', driverId: 'offline-driver-id' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockOrderRedisRepo.claimOrder).not.toHaveBeenCalled();
    });

    it('should successfully claim order when driver is ONLINE and APPROVED', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          is_driver: true,
          is_active: true,
          status: 'ONLINE',
          verification_status: 'APPROVED',
        }),
      });

      mockOrderRedisRepo.claimOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order-1',
          customer_id: 'cust-1',
          restaurant_id: 'rest-1',
          driver_id: 'online-driver-id',
          total_amount: 150000,
          status: OrderStatus.DELIVERING,
          delivery_address: '123 Lê Lợi, Q1',
          items: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      const order = await useCase.execute({
        orderId: 'order-1',
        driverId: 'online-driver-id',
      });

      expect(order.driver_id).toBe('online-driver-id');
      expect(order.status).toBe(OrderStatus.DELIVERING);
      expect(mockOrderRedisRepo.claimOrder).toHaveBeenCalledWith('order-1', 'online-driver-id');
      expect(mockSqsService.publishEvent).toHaveBeenCalled();
    });
  });
});
