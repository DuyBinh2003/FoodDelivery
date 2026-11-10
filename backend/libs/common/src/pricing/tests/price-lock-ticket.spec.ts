/**
 * @file price-lock-ticket.spec.ts
 * @description Unit tests for PriceLockTicketService (Redis TTL, HMAC SHA-256 integrity and one-time consumption).
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoneException, ForbiddenException } from '@nestjs/common';
import { PriceLockTicketService } from '@/common/pricing/price-lock-ticket.service.js';
import type { ConfigService } from '@nestjs/config';
import type { PricingBreakdown } from '@/common/pricing/pricing-rules.js';

describe('Price Lock Ticket Suite (#84)', () => {
  let ticketService: PriceLockTicketService;
  let mockConfigService: Partial<ConfigService>;
  let memoryStore: Map<string, string>;

  const sampleBreakdown: PricingBreakdown = {
    itemsSubtotal: 80000,
    baseShippingFee: 15000,
    surgeMultiplier: 1.2,
    surgeFee: 3000,
    weatherFee: 10000,
    nightFee: 0,
    discountAmount: 0,
    totalShippingFee: 28000,
    totalAmount: 108000,
    appliedRules: ['DistancePricingRule', 'SurgeDemandPricingRule', 'WeatherSurgePricingRule'],
  };

  beforeEach(() => {
    memoryStore = new Map();

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'PRICE_LOCK_SECRET') return 'test-price-lock-secret-key-12345';
        if (key === 'redis.host') return 'localhost';
        if (key === 'redis.port') return 6379;
        return undefined;
      }),
    };

    ticketService = new PriceLockTicketService(mockConfigService as ConfigService);

    // Mock internal Redis client
    (ticketService as any).client = {
      isOpen: true,
      get: vi.fn().mockImplementation(async (key: string) => memoryStore.get(key) || null),
      set: vi.fn().mockImplementation(async (key: string, val: string) => {
        memoryStore.set(key, val);
        return 'OK';
      }),
      del: vi.fn().mockImplementation(async (key: string) => {
        memoryStore.delete(key);
        return 1;
      }),
    };
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Phát hành PriceLockTicket có chữ ký số HMAC hợp lệ và TTL 300s', async () => {
      const ticket = await ticketService.createTicket({
        restaurantId: 'rest-uuid-1',
        breakdown: sampleBreakdown,
        items: [{ menu_item_id: 'm1', quantity: 2, unit_price: 40000 }],
        ttlSeconds: 300,
      });

      expect(ticket.ticketId).toMatch(/^plt_[a-f0-9]{32}$/);
      expect(ticket.ttlSeconds).toBe(300);
      expect(ticket.signature).toBeDefined();
      expect(ticket.breakdown.totalAmount).toBe(108000);

      // Verify stored in redis memory
      const stored = await ticketService.peekTicket(ticket.ticketId);
      expect(stored).not.toBeNull();
      expect(stored?.ticketId).toBe(ticket.ticketId);
    });

    it('HP-02: Xác thực và tiêu thụ vé nguyên tử thành công (Vé bị xóa khỏi Redis sau khi dùng)', async () => {
      const ticket = await ticketService.createTicket({
        restaurantId: 'rest-uuid-1',
        breakdown: sampleBreakdown,
        items: [{ menu_item_id: 'm1', quantity: 2, unit_price: 40000 }],
      });

      // Lần 1: Xác thực thành công
      const verified = await ticketService.verifyAndConsumeTicket(ticket.ticketId);
      expect(verified.ticketId).toBe(ticket.ticketId);
      expect(verified.breakdown.totalAmount).toBe(108000);

      // Lần 2: Vé đã bị tiêu thụ -> Báo lỗi 410 Gone (One-time usage)
      await expect(ticketService.verifyAndConsumeTicket(ticket.ticketId)).rejects.toThrow(GoneException);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: peekTicket đọc thông tin vé mà không làm mất vé trong Redis', async () => {
      const ticket = await ticketService.createTicket({
        restaurantId: 'rest-uuid-1',
        breakdown: sampleBreakdown,
        items: [{ menu_item_id: 'm1', quantity: 1, unit_price: 80000 }],
      });

      const peek1 = await ticketService.peekTicket(ticket.ticketId);
      const peek2 = await ticketService.peekTicket(ticket.ticketId);

      expect(peek1).not.toBeNull();
      expect(peek2).not.toBeNull();
      expect(peek1?.ticketId).toBe(ticket.ticketId);
    });

    it('EC-02: Định dạng mã vé sai hoặc không có tiền tố plt_ bị từ chối ngay lập tức với GoneException', async () => {
      await expect(ticketService.verifyAndConsumeTicket('invalid_prefix_123')).rejects.toThrow(GoneException);
      await expect(ticketService.verifyAndConsumeTicket('')).rejects.toThrow(GoneException);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Vé đã hết hạn (Expired Ticket) ném lỗi HTTP 410 Gone', async () => {
      const ticket = await ticketService.createTicket({
        restaurantId: 'rest-uuid-1',
        breakdown: sampleBreakdown,
        items: [{ menu_item_id: 'm1', quantity: 1, unit_price: 80000 }],
        ttlSeconds: -10, // Đã hết hạn trong quá khứ
      });

      await expect(ticketService.verifyAndConsumeTicket(ticket.ticketId)).rejects.toThrow(GoneException);
    });

    it('ER-02: Giả mạo dữ liệu giá (Tampering Attack) bị phát hiện bởi HMAC và ném ForbiddenException (403)', async () => {
      const ticket = await ticketService.createTicket({
        restaurantId: 'rest-uuid-1',
        breakdown: sampleBreakdown,
        items: [{ menu_item_id: 'm1', quantity: 1, unit_price: 80000 }],
      });

      // Kẻ tấn công can thiệp sửa đổi giá vé trong Redis xuống 1.000đ nhưng không có secret key
      const storedRaw = memoryStore.get(`price_lock:ticket:${ticket.ticketId}`)!;
      const tampered = JSON.parse(storedRaw);
      tampered.breakdown.totalAmount = 1000;
      memoryStore.set(`price_lock:ticket:${ticket.ticketId}`, JSON.stringify(tampered));

      await expect(ticketService.verifyAndConsumeTicket(ticket.ticketId)).rejects.toThrow(ForbiddenException);
    });
  });
});

