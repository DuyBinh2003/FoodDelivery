/**
 * @file ai-assistant-ui.test.ts
 * @description Unit tests for AI Food Assistant UI logic, state management, dish matching, and notification payload parsing
 * @traceability
 *   - Plan: docs/plans/platform/ai-assistant-notification-workflows.md
 *   - Doc: docs/services/search-service.md, docs/services/order-service.md
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { SuggestedDish } from '../types/ai.types';

export function validateAiPrompt(prompt: string): { isValid: boolean; error?: string } {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Vui lòng nhập câu hỏi hoặc sở thích món ăn của bạn' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Câu hỏi quá ngắn, vui lòng mô tả chi tiết hơn (tối thiểu 3 ký tự)' };
  }
  if (trimmed.length > 500) {
    return { isValid: false, error: 'Câu hỏi vượt quá giới hạn cho phép (tối đa 500 ký tự)' };
  }
  return { isValid: true };
}

export function formatDishCartItem(dish: SuggestedDish) {
  return {
    id: dish.dishId,
    item_id: dish.dishId,
    name: dish.dishName,
    price: Math.max(0, dish.price),
    quantity: 1,
    image_url: dish.imageUrl || '/images/default-dish.jpg',
    restaurantId: dish.restaurantId,
    restaurantName: dish.restaurantName,
  };
}

export function parseSystemNotification(rawPayload: Record<string, unknown>) {
  const event = String(rawPayload.event || 'UNKNOWN');
  const title = typeof rawPayload.title === 'string' ? rawPayload.title : 'Thông báo hệ thống';
  const message = typeof rawPayload.message === 'string' ? rawPayload.message : 'Có cập nhật mới về đơn hàng của bạn';

  return {
    id: String(rawPayload.id || `notif-${Date.now()}`),
    title,
    message,
    type: event.startsWith('order.') ? 'ORDER_EVENT' : 'AI_RECOMMEND',
    read: false,
    timestamp: 'Vừa xong',
  };
}

describe('AI Food Assistant UI & Notification Workflows Suite', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Validate thành công prompt tự nhiên hợp lệ', () => {
      const res = validateAiPrompt('hôm nay ốm muốn ăn cháo nóng dưới 50k');
      assert.strictEqual(res.isValid, true);
      assert.strictEqual(res.error, undefined);
    });

    it('2. Chuyển đổi SuggestedDish sang CartItem chuẩn xác', () => {
      const dish: SuggestedDish = {
        dishId: 'dish-101',
        dishName: 'Cháo Gà Hạt Sen Nóng Hổi',
        restaurantId: 'rest-001',
        restaurantName: 'Quán Cô Ba',
        price: 45000,
        rating: 4.8,
        matchReason: 'Phù hợp khi ốm',
      };
      const cartItem = formatDishCartItem(dish);
      assert.strictEqual(cartItem.id, 'dish-101');
      assert.strictEqual(cartItem.name, 'Cháo Gà Hạt Sen Nóng Hổi');
      assert.strictEqual(cartItem.price, 45000);
      assert.strictEqual(cartItem.quantity, 1);
      assert.strictEqual(cartItem.restaurantId, 'rest-001');
    });

    it('3. Parse thông báo webhook sự kiện order.created từ n8n thành công', () => {
      const payload = {
        id: 'evt-999',
        event: 'order.created',
        title: 'Đơn hàng mới đã được xác nhận',
        message: 'Nhà hàng đã nhận đơn qua n8n Telegram Bot',
      };
      const notif = parseSystemNotification(payload);
      assert.strictEqual(notif.id, 'evt-999');
      assert.strictEqual(notif.type, 'ORDER_EVENT');
      assert.strictEqual(notif.title, 'Đơn hàng mới đã được xác nhận');
      assert.strictEqual(notif.read, false);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (TRƯỜNG HỢP BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Prompt chạm ngưỡng biên 3 ký tự: Validate hợp lệ', () => {
      const res = validateAiPrompt('phở');
      assert.strictEqual(res.isValid, true);
    });

    it('2. Prompt chạm ngưỡng biên 500 ký tự: Validate hợp lệ', () => {
      const res = validateAiPrompt('a'.repeat(500));
      assert.strictEqual(res.isValid, true);
    });

    it('3. Thẻ món ăn có giá bằng 0 hoặc âm: Đảm bảo format giá không âm', () => {
      const dish: SuggestedDish = {
        dishId: 'dish-free',
        dishName: 'Nước Chấm Thêm Miễn Phí',
        restaurantId: 'rest-001',
        restaurantName: 'Quán Cô Ba',
        price: -5000,
        rating: 5.0,
        matchReason: 'Tặng kèm',
      };
      const cartItem = formatDishCartItem(dish);
      assert.strictEqual(cartItem.price, 0);
    });

    it('4. Notification payload bị thiếu thông tin: Fallback an toàn không crash', () => {
      const notif = parseSystemNotification({});
      assert.strictEqual(notif.title, 'Thông báo hệ thống');
      assert.strictEqual(notif.message, 'Có cập nhật mới về đơn hàng của bạn');
      assert.strictEqual(notif.type, 'AI_RECOMMEND');
      assert.strictEqual(notif.read, false);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOWS (TỪ CHỐI & BẢO VỆ)
  // ==========================================
  describe('🔴 Error / Rejection Flow', () => {
    it('1. Từ chối prompt rỗng hoặc toàn khoảng trắng', () => {
      const empty = validateAiPrompt('');
      assert.strictEqual(empty.isValid, false);
      assert.match(empty.error || '', /Vui lòng nhập câu hỏi/);

      const spaces = validateAiPrompt('    ');
      assert.strictEqual(spaces.isValid, false);
      assert.match(spaces.error || '', /Vui lòng nhập câu hỏi/);
    });

    it('2. Từ chối prompt dưới 3 ký tự (quá ngắn)', () => {
      const tooShort = validateAiPrompt('ăn');
      assert.strictEqual(tooShort.isValid, false);
      assert.match(tooShort.error || '', /tối thiểu 3 ký tự/);
    });

    it('3. Từ chối prompt vượt quá 500 ký tự (quá dài)', () => {
      const tooLong = validateAiPrompt('x'.repeat(501));
      assert.strictEqual(tooLong.isValid, false);
      assert.match(tooLong.error || '', /tối đa 500 ký tự/);
    });
  });
});
