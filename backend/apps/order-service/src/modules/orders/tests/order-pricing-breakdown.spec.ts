/**
 * @test-plan file:///c%3A/Users/DELL/.gemini/antigravity-ide/brain/6c87a844-bf88-49da-8c8c-44b663e602f8/order_pricing_breakdown_plan.md
 * @business-flow Order Pricing Breakdown, Restaurant Commission & Driver Fee Settlement
 * @usecases CreateOrderUseCase, GetDriverTripsUseCase, UpdateDriverTripStatusUseCase
 *
 * Test Matrix:
 * - 🟢 Happy Path: CreateOrder calculates subtotal, fixed 15.000 VND delivery fee, and total_amount = subtotal + 15.000
 * - 🟢 Happy Path: GetDriverTrips calculates 15.000 delivery fee, 1.500 platform fee (10%), and 13.500 driver earnings
 * - 🟢 Happy Path: UpdateDriverTripStatus COMPLETED settles driver trip with delivery_fee (15.000) instead of order total
 * - 🟡 Edge Case: Order without explicit delivery_fee defaults cleanly to 15.000 VND
 * - 🔴 Error Flow: Unauthorized driver cannot update trip status (ForbiddenException)
 * - 🔴 Error Flow: Updating non-existent trip throws NotFoundException
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import { GetDriverTripsUseCase } from '@/modules/orders/usecases/get-driver-trips.usecase.js';
import { UpdateDriverTripStatusUseCase } from '@/modules/orders/usecases/update-driver-trip-status.usecase.js';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

describe('Order Pricing Breakdown & Settlement', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('CreateOrderUseCase - Pricing Breakdown', () => {
    let useCase: CreateOrderUseCase;
    let mockRedisRepo: {
      saveInflightOrder: ReturnType<typeof vi.fn>;
    };
    let mockSqsService: {
      publishEvent: ReturnType<typeof vi.fn>;
    };
    let mockConfigService: {
      getOrThrow: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockRedisRepo = {
        saveInflightOrder: vi.fn().mockResolvedValue(undefined),
      };
      mockSqsService = {
        publishEvent: vi.fn().mockResolvedValue(undefined),
      };
      mockConfigService = {
        getOrThrow: vi.fn(),
      };

      useCase = new CreateOrderUseCase(
        mockRedisRepo as any,
        mockSqsService as any,
        mockConfigService as any,
      );
    });

    it('🟢 Happy Path: should separate subtotal, delivery_fee (15000), and total_amount = subtotal + 15000', async () => {
      const command = {
        customer_id: 'cust-123',
        restaurant_id: 'rest-456',
        delivery_address: '123 Nguyen Hue, Q1',
        items: [
          {
            menu_item_id: 'item-1',
            name: 'Phở Bò',
            quantity: 2,
            unit_price: 50000,
          },
          {
            menu_item_id: 'item-2',
            name: 'Trà Đá',
            quantity: 1,
            unit_price: 5000,
          },
        ],
      };

      const result = await useCase.execute(command);

      const expectedSubtotal = 2 * 50000 + 1 * 5000; // 105.000
      const expectedDeliveryFee = 15000;
      const expectedTotal = expectedSubtotal + expectedDeliveryFee; // 120.000

      expect(result.subtotal).toBe(expectedSubtotal);
      expect(result.delivery_fee).toBe(expectedDeliveryFee);
      expect(result.total_amount).toBe(expectedTotal);

      expect(mockRedisRepo.saveInflightOrder).toHaveBeenCalledWith(
        result.id,
        expect.objectContaining({
          subtotal: expectedSubtotal,
          delivery_fee: expectedDeliveryFee,
          total_amount: expectedTotal,
        }),
      );
    });
  });

  describe('GetDriverTripsUseCase - Earnings Calculation', () => {
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
        getOrThrow: vi.fn().mockReturnValue('http://localhost:3003'),
      };

      useCase = new GetDriverTripsUseCase(
        mockOrderReadRepo as any,
        mockOrderRedisRepo as any,
        mockConfigService as any,
      );
    });

    it('🟢 Happy Path: should accurately calculate 15.000đ delivery fee, 1.500đ platform fee, and 13.500đ net earnings', async () => {
      mockOrderRedisRepo.getDriverInflightOrders.mockResolvedValue([
        {
          id: 'inflight-order-1',
          restaurant_id: 'rest-1',
          driver_id: 'driver-999',
          subtotal: 60000,
          delivery_fee: 15000,
          total_amount: 75000,
          status: OrderStatus.DELIVERING,
          delivery_address: '456 Le Loi, Q1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: [],
        },
      ]);
      mockOrderReadRepo.findTripsByDriverId.mockResolvedValue([]);

      const trips = await useCase.execute({ driverId: 'driver-999' });

      expect(trips).toHaveLength(1);
      const trip = trips[0];
      expect(trip.delivery_fee).toBe(15000);
      expect(trip.platform_fee).toBe(1500); // 10%
      expect(trip.driver_earnings).toBe(13500); // 15.000 - 1.500
      expect(trip.total_amount).toBe(75000);
    });

    it('🟡 Edge Case: should default delivery_fee to 15.000đ if missing from legacy records', async () => {
      mockOrderRedisRepo.getDriverInflightOrders.mockResolvedValue([]);
      mockOrderReadRepo.findTripsByDriverId.mockResolvedValue([
        {
          id: 'legacy-order-1',
          restaurant_id: 'rest-1',
          driver_id: 'driver-999',
          total_amount: 50000,
          status: OrderStatus.COMPLETED,
          delivery_address: '789 Tran Hung Dao',
          created_at: new Date(),
          updated_at: new Date(),
          items: [],
        },
      ]);

      const trips = await useCase.execute({ driverId: 'driver-999' });

      expect(trips).toHaveLength(1);
      const trip = trips[0];
      expect(trip.delivery_fee).toBe(15000);
      expect(trip.platform_fee).toBe(1500);
      expect(trip.driver_earnings).toBe(13500);
    });
  });

  describe('UpdateDriverTripStatusUseCase - Trip Settlement', () => {
    let useCase: UpdateDriverTripStatusUseCase;
    let mockOrderRedisRepo: {
      getInflightOrder: ReturnType<typeof vi.fn>;
      updateStatus: ReturnType<typeof vi.fn>;
      publishOrderEvent: ReturnType<typeof vi.fn>;
      setTtl: ReturnType<typeof vi.fn>;
    };
    let mockOrderReadRepo: {
      findById: ReturnType<typeof vi.fn>;
    };
    let mockOrderWriteRepo: {
      persistCompletedOrder: ReturnType<typeof vi.fn>;
      save: ReturnType<typeof vi.fn>;
    };
    let mockSqsService: {
      publishEvent: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockOrderRedisRepo = {
        getInflightOrder: vi.fn(),
        updateStatus: vi.fn(),
        publishOrderEvent: vi.fn(),
        setTtl: vi.fn(),
      };
      mockOrderReadRepo = {
        findById: vi.fn(),
      };
      mockOrderWriteRepo = {
        persistCompletedOrder: vi.fn(),
        save: vi.fn(),
      };
      mockSqsService = {
        publishEvent: vi.fn().mockResolvedValue(undefined),
      };

      useCase = new UpdateDriverTripStatusUseCase(
        mockOrderRedisRepo as any,
        mockOrderReadRepo as any,
        mockOrderWriteRepo as any,
        mockSqsService as any,
      );
    });

    it('🟢 Happy Path: should settle trip with delivery_fee (15.000) when trip completed', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = mockFetch;
      process.env.PAYMENT_SERVICE_URL = 'http://localhost:3004';

      mockOrderRedisRepo.getInflightOrder.mockResolvedValue({
        id: 'order-settle-1',
        driver_id: 'driver-111',
        subtotal: 100000,
        delivery_fee: 15000,
        total_amount: 115000,
        status: OrderStatus.DELIVERING,
      });

      mockOrderRedisRepo.updateStatus.mockResolvedValue({
        id: 'order-settle-1',
        driver_id: 'driver-111',
        status: OrderStatus.COMPLETED,
        subtotal: 100000,
        delivery_fee: 15000,
        total_amount: 115000,
      });

      mockOrderWriteRepo.persistCompletedOrder.mockResolvedValue({
        id: 'order-settle-1',
        driver_id: 'driver-111',
        subtotal: 100000,
        delivery_fee: 15000,
        total_amount: 115000,
        status: OrderStatus.COMPLETED,
      });

      await useCase.execute({
        driverId: 'driver-111',
        orderId: 'order-settle-1',
        status: OrderStatus.COMPLETED,
      });

      expect(mockOrderWriteRepo.persistCompletedOrder).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3004/internal/ledger/settle-trip',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            orderId: 'order-settle-1',
            driverId: 'driver-111',
            tripAmount: 15000, // Cước vận chuyển 15.000đ, KHÔNG PHẢI 115.000đ
            feeRate: 10,
          }),
        }),
      );
    });

    it('🔴 Error Flow: should reject with ForbiddenException when unauthorized driver tries to update trip', async () => {
      mockOrderRedisRepo.getInflightOrder.mockResolvedValue({
        id: 'order-forbidden',
        driver_id: 'driver-authorized',
        status: OrderStatus.DELIVERING,
      });

      await expect(
        useCase.execute({
          driverId: 'driver-intruder',
          orderId: 'order-forbidden',
          status: OrderStatus.COMPLETED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('🔴 Error Flow: should reject with NotFoundException when trip is not in Redis or DB', async () => {
      mockOrderRedisRepo.getInflightOrder.mockResolvedValue(null);
      mockOrderReadRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({
          driverId: 'driver-1',
          orderId: 'order-missing',
          status: OrderStatus.COMPLETED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
