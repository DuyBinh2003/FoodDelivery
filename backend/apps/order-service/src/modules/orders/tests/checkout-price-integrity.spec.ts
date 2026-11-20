/**
 * @file checkout-price-integrity.spec.ts
 * @description Unit tests for Order Checkout Price Integrity with Price Lock Ticket.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoneException, ForbiddenException } from '@nestjs/common';
import { CreateOrderUseCase } from '@/modules/orders/usecases/create-order.usecase.js';
import type { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import type { SqsService } from '@/common/messaging/sqs.service.js';
import type { ConfigService } from '@nestjs/config';
import type { PriceLockTicketService, PriceLockTicket } from '@/common/pricing/price-lock-ticket.service.js';

describe('Checkout Price Integrity Suite (#84)', () => {
  let createOrderUseCase: CreateOrderUseCase;
  let mockOrderRedisRepo: Partial<OrderRedisRepository>;
  let mockSqsService: Partial<SqsService>;
  let mockConfigService: Partial<ConfigService>;
  let mockPriceLockTicketService: Partial<PriceLockTicketService>;

  const validTicket: PriceLockTicket = {
    ticketId: 'plt_valid1234567890abcdef12345678',
    restaurantId: 'rest-uuid-1',
    breakdown: {
      itemsSubtotal: 100000,
      baseShippingFee: 15000,
      surgeMultiplier: 1.5,
      surgeFee: 7500,
      weatherFee: 10000,
      nightFee: 0,
      discountAmount: 0,
      totalShippingFee: 32500,
      totalAmount: 132500,
      appliedRules: ['DistancePricingRule', 'SurgeDemandPricingRule', 'WeatherSurgePricingRule'],
    },
    items: [{ menu_item_id: 'item-1', quantity: 2, unit_price: 50000 }],
    signature: 'mock_signature_valid',
    expiresAt: Date.now() + 300000,
    ttlSeconds: 300,
  };

  beforeEach(() => {
    mockOrderRedisRepo = {
      saveInflightOrder: vi.fn().mockResolvedValue(undefined),
    };

    mockSqsService = {
      publishEvent: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue('http://localhost:3004'),
    };

    mockPriceLockTicketService = {
      verifyAndConsumeTicket: vi.fn().mockResolvedValue(validTicket),
    };

    createOrderUseCase = new CreateOrderUseCase(
      mockOrderRedisRepo as OrderRedisRepository,
      mockSqsService as SqsService,
      mockConfigService as ConfigService,
      undefined, // atomicInventoryService
      mockPriceLockTicketService as PriceLockTicketService,
    );
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Tạo đơn hàng thành công và chốt cứng biểu phí theo Price Lock Ticket đã khóa', async () => {
      const order = await createOrderUseCase.execute({
        customer_id: 'cust-uuid-1',
        restaurant_id: 'rest-uuid-1',
        delivery_address: '123 Nguyễn Huệ, Q1, TP.HCM',
        items: [{ menu_item_id: 'item-1', quantity: 2, unit_price: 50000 }],
        price_lock_ticket_id: validTicket.ticketId,
      });

      expect(mockPriceLockTicketService.verifyAndConsumeTicket).toHaveBeenCalledWith(validTicket.ticketId);
      expect(order.delivery_fee).toBe(32500); // 15k base + 7.5k surge + 10k weather
      expect(order.total_amount).toBe(132500); // 100k subtotal + 32.5k shipping
      expect(mockOrderRedisRepo.saveInflightOrder).toHaveBeenCalled();
      expect(mockSqsService.publishEvent).toHaveBeenCalled();
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Không cung cấp price_lock_ticket_id -> Mặc định áp dụng phí chuẩn 15.000đ an toàn', async () => {
      const order = await createOrderUseCase.execute({
        customer_id: 'cust-uuid-1',
        restaurant_id: 'rest-uuid-1',
        delivery_address: '123 Nguyễn Huệ, Q1, TP.HCM',
        items: [{ menu_item_id: 'item-1', quantity: 2, unit_price: 50000 }],
      });

      expect(mockPriceLockTicketService.verifyAndConsumeTicket).not.toHaveBeenCalled();
      expect(order.delivery_fee).toBe(15000);
      expect(order.total_amount).toBe(115000); // 100k + 15k
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Vé khóa giá đã hết hạn (410 Gone) -> Từ chối tạo đơn và yêu cầu cập nhật giỏ hàng', async () => {
      mockPriceLockTicketService.verifyAndConsumeTicket = vi
        .fn()
        .mockRejectedValue(new GoneException('Vé khóa giá đã hết hạn.'));

      await expect(
        createOrderUseCase.execute({
          customer_id: 'cust-uuid-1',
          restaurant_id: 'rest-uuid-1',
          delivery_address: '123 Nguyễn Huệ',
          items: [{ menu_item_id: 'item-1', quantity: 2, unit_price: 50000 }],
          price_lock_ticket_id: 'plt_expired',
        }),
      ).rejects.toThrow(GoneException);

      expect(mockOrderRedisRepo.saveInflightOrder).not.toHaveBeenCalled();
      expect(mockSqsService.publishEvent).not.toHaveBeenCalled();
    });

    it('ER-02: Giả mạo dữ liệu giá trong vé (403 Forbidden) -> Từ chối tạo đơn ngay lập tức', async () => {
      mockPriceLockTicketService.verifyAndConsumeTicket = vi
        .fn()
        .mockRejectedValue(new ForbiddenException('Chữ ký số vé không hợp lệ.'));

      await expect(
        createOrderUseCase.execute({
          customer_id: 'cust-uuid-1',
          restaurant_id: 'rest-uuid-1',
          delivery_address: '123 Nguyễn Huệ',
          items: [{ menu_item_id: 'item-1', quantity: 2, unit_price: 50000 }],
          price_lock_ticket_id: 'plt_tampered',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockOrderRedisRepo.saveInflightOrder).not.toHaveBeenCalled();
      expect(mockSqsService.publishEvent).not.toHaveBeenCalled();
    });
  });
});

