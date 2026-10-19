/**
 * @file order-loyalty.spec.ts
 * @description Unit tests for Order Service Loyalty Points Integration (Sử dụng điểm thưởng khi tạo đơn hàng)
 * @traceability
 *   - Plan: docs/plans/platform/loyalty-points-rewards-engine.md
 *   - Doc: docs/business/business-roadmap.md (Issue C6 - Epic 2)
 *   - Scenarios: Happy Path, Edge Cases, Error Flow
 *   - Use Cases: CreateOrderUseCase
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import type { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import type { SqsService } from '@/common/messaging/sqs.service.js';
import type { ConfigService } from '@nestjs/config';

describe('Order Service Loyalty Points Integration', () => {
  let useCase: CreateOrderUseCase;
  let mockRedisRepo: {
    saveInflightOrder: ReturnType<typeof vi.fn>;
  };
  let mockSqsService: {
    publishEvent: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    mockRedisRepo = {
      saveInflightOrder: vi.fn().mockResolvedValue(undefined),
    };
    mockSqsService = {
      publishEvent: vi.fn().mockResolvedValue(undefined),
    };
    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3001'),
    };

    useCase = new CreateOrderUseCase(
      mockRedisRepo as unknown as OrderRedisRepository,
      mockSqsService as unknown as SqsService,
      mockConfigService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('🟢 Happy Path', () => {
    it('1. Khách hàng dùng 500 điểm: giảm 5.000 VND và tính đúng tổng tiền', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          points_burned: 500,
          discount_amount: 5000,
        }),
      });

      const order = await useCase.execute({
        customer_id: 'cust-123',
        restaurant_id: 'rest-456',
        delivery_address: '123 Nguyen Hue, Q1',
        points_to_use: 500,
        items: [
          {
            menu_item_id: 'item-1',
            name: 'Phở Bò',
            quantity: 2,
            unit_price: 50000, // subtotal = 100.000 VND
          },
        ],
      });

      // Subtotal = 100.000, Discount = 5.000, Delivery = 15.000 -> Total = 110.000
      expect(order.subtotal).toBe(100000);
      expect(order.points_used).toBe(500);
      expect(order.points_discount).toBe(5000);
      expect(order.delivery_fee).toBe(15000);
      expect(order.total_amount).toBe(110000);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/internal/loyalty/burn',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"points":500'),
        }),
      );
    });
  });

  describe('🟡 Edge Cases', () => {
    it('1. Đổi điểm vượt trần 50% Subtotal: ném BadRequestException', async () => {
      // Subtotal = 40.000 VND, trần 50% = 20.000 VND (max 2.000 điểm). Khách đòi dùng 2.500 điểm (25.000 VND)
      await expect(
        useCase.execute({
          customer_id: 'cust-123',
          restaurant_id: 'rest-456',
          delivery_address: '123 Nguyen Hue, Q1',
          points_to_use: 2500,
          items: [
            {
              menu_item_id: 'item-1',
              name: 'Trà Sữa',
              quantity: 1,
              unit_price: 40000,
            },
          ],
        }),
      ).rejects.toThrow('vượt quá trần giảm giá cho phép');
    });
  });

  describe('🔴 Error / Rejection Flow', () => {
    it('1. Đổi điểm dưới mức tối thiểu 100 điểm: ném BadRequestException', async () => {
      await expect(
        useCase.execute({
          customer_id: 'cust-123',
          restaurant_id: 'rest-456',
          delivery_address: '123 Nguyen Hue, Q1',
          points_to_use: 50,
          items: [
            {
              menu_item_id: 'item-1',
              name: 'Cơm Tấm',
              quantity: 1,
              unit_price: 50000,
            },
          ],
        }),
      ).rejects.toThrow('Số điểm quy đổi tối thiểu là 100 điểm');
    });

    it('2. User Service trả lỗi (ví dụ không đủ điểm): rethrow BadRequestException', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Số điểm tích lũy không đủ' }),
      });

      await expect(
        useCase.execute({
          customer_id: 'cust-123',
          restaurant_id: 'rest-456',
          delivery_address: '123 Nguyen Hue, Q1',
          points_to_use: 1000,
          items: [
            {
              menu_item_id: 'item-1',
              name: 'Phở Bò',
              quantity: 2,
              unit_price: 50000,
            },
          ],
        }),
      ).rejects.toThrow('Số điểm tích lũy không đủ');
    });
  });
});
