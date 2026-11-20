/**
 * @file out-of-stock.test.ts
 * @description Unit tests for Cart Out-of-Stock Conflict Resolution & User Feedback
 * @trace docs/plans/platform/high-concurrency-cache-stampede-and-atomic-inventory.md (Issue #81)
 * @scenarios
 *   - Happy Path: Partition valid and depleted items, generate actionable Vietnamese toast
 *   - Edge Cases: All items depleted, multiple depleted items concatenation
 *   - Error Flow: Empty cart or no depleted items should leave cart untouched
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handleOutOfStockConflict } from '../utils/out-of-stock.utils.ts';

describe('Cart Out-of-Stock Conflict Resolution Suite (#81)', () => {
  const sampleCart = [
    { id: 'item-1', name: 'Cơm sườn bì chả', quantity: 2 },
    { id: 'item-2', name: 'Canh rong biển', quantity: 1 },
    { id: 'item-3', name: 'Trà tắc khổng lồ', quantity: 2 },
  ];

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG TIÊU CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Tách đúng món hết hàng, giữ lại món còn hàng và sinh thông báo tiếng Việt', () => {
      const result = handleOutOfStockConflict(sampleCart, ['item-2']);

      assert.strictEqual(result.hasDepleted, true);
      assert.strictEqual(result.validItems.length, 2);
      assert.strictEqual(result.depletedItems.length, 1);
      assert.strictEqual(result.depletedItems[0].name, 'Canh rong biển');
      assert.ok(result.toastMessage.includes('"Canh rong biển" vừa hết hàng do lượng đặt tăng đột biến'));
    });

    it('HP-02: Nối tên nhiều món hết hàng rõ ràng trong thông báo', () => {
      const result = handleOutOfStockConflict(sampleCart, ['item-1', 'item-3']);

      assert.strictEqual(result.hasDepleted, true);
      assert.strictEqual(result.validItems.length, 1);
      assert.strictEqual(result.validItems[0].id, 'item-2');
      assert.ok(result.toastMessage.includes('"Cơm sườn bì chả", "Trà tắc khổng lồ"'));
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (BIÊN & GIỚI HẠN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Toàn bộ giỏ hàng đều hết hàng -> validItems rỗng, tất cả chuyển sang depletedItems', () => {
      const result = handleOutOfStockConflict(sampleCart, ['item-1', 'item-2', 'item-3']);

      assert.strictEqual(result.hasDepleted, true);
      assert.strictEqual(result.validItems.length, 0);
      assert.strictEqual(result.depletedItems.length, 3);
    });

    it('EC-02: Danh sách ID hết hàng chứa ID lạ không có trong giỏ -> Bỏ qua an toàn', () => {
      const result = handleOutOfStockConflict(sampleCart, ['unknown-id-999']);

      assert.strictEqual(result.hasDepleted, false);
      assert.strictEqual(result.validItems.length, 3);
      assert.strictEqual(result.depletedItems.length, 0);
      assert.strictEqual(result.toastMessage, '');
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Danh sách out of stock rỗng -> Giữ nguyên toàn bộ giỏ hàng', () => {
      const result = handleOutOfStockConflict(sampleCart, []);

      assert.strictEqual(result.hasDepleted, false);
      assert.strictEqual(result.validItems.length, 3);
      assert.strictEqual(result.depletedItems.length, 0);
    });

    it('ER-02: Giỏ hàng đầu vào rỗng -> Xử lý an toàn không crash', () => {
      const result = handleOutOfStockConflict([], ['item-1']);

      assert.strictEqual(result.hasDepleted, false);
      assert.strictEqual(result.validItems.length, 0);
      assert.strictEqual(result.depletedItems.length, 0);
    });
  });
});

