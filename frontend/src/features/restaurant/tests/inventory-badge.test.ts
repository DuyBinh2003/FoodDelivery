/**
 * @file inventory-badge.test.ts
 * @description Unit tests for Real-time Inventory Status Badges & Quantity Validations
 * @trace docs/plans/platform/high-concurrency-cache-stampede-and-atomic-inventory.md (Issue #81)
 * @scenarios
 *   - Happy Path: Display "Còn hàng", "Chỉ còn X suất", "Đã hết hàng" with appropriate styling
 *   - Edge Cases: Exact boundaries (0, 1, 5, 6), undefined/null stock (unlimited items)
 *   - Error Flow: Prevent adding out-of-stock items, reject quantities exceeding available stock
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getInventoryStatusBadge,
  validateItemStockBeforeAdd,
} from '../utils/inventory.utils.ts';

describe('Real-time Inventory Status Badge Suite (#81)', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG TIÊU CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Hiển thị badge "Chỉ còn X suất" kèm animation nhấp nháy khi tồn kho 1 <= stock <= 5', () => {
      const badge3 = getInventoryStatusBadge(3);
      assert.strictEqual(badge3.label, 'Chỉ còn 3 suất');
      assert.strictEqual(badge3.isLowStock, true);
      assert.strictEqual(badge3.isOutOfStock, false);
      assert.ok(badge3.badgeClass.includes('animate-pulse'));
      assert.ok(badge3.badgeClass.includes('text-amber-600'));
    });

    it('HP-02: Hiển thị badge "Đã hết hàng" khi stock === 0', () => {
      const badge0 = getInventoryStatusBadge(0);
      assert.strictEqual(badge0.label, 'Đã hết hàng');
      assert.strictEqual(badge0.isOutOfStock, true);
      assert.strictEqual(badge0.isLowStock, false);
      assert.ok(badge0.badgeClass.includes('text-destructive'));
    });

    it('HP-03: Hiển thị badge "Còn hàng" khi stock > 5 hoặc không giới hạn số lượng', () => {
      const badge20 = getInventoryStatusBadge(20);
      assert.strictEqual(badge20.label, 'Còn hàng');
      assert.strictEqual(badge20.isOutOfStock, false);

      const unlimited = getInventoryStatusBadge(null);
      assert.strictEqual(unlimited.label, 'Còn hàng');
      assert.strictEqual(unlimited.isOutOfStock, false);
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (BIÊN & GIỚI HẠN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Mốc biên đúng 5 suất -> Hiển thị "Chỉ còn 5 suất" (Low Stock)', () => {
      const badge5 = getInventoryStatusBadge(5);
      assert.strictEqual(badge5.label, 'Chỉ còn 5 suất');
      assert.strictEqual(badge5.isLowStock, true);
    });

    it('EC-02: Mốc biên 6 suất -> Chuyển sang "Còn hàng" (Normal Stock)', () => {
      const badge6 = getInventoryStatusBadge(6);
      assert.strictEqual(badge6.label, 'Còn hàng');
      assert.strictEqual(badge6.isLowStock, false);
    });

    it('EC-03: Thêm số lượng bằng đúng số lượng tồn kho còn lại -> Cho phép hợp lệ', () => {
      const validation = validateItemStockBeforeAdd(4, 4, 'Bún bò Huế');
      assert.strictEqual(validation.canAdd, true);
      assert.strictEqual(validation.maxAllowed, 4);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('ER-01: Chặn thêm vào giỏ khi món ăn đã hết hàng (stock = 0)', () => {
      const validation = validateItemStockBeforeAdd(0, 1, 'Trà sữa trân châu');
      assert.strictEqual(validation.canAdd, false);
      assert.ok(validation.error?.includes('hiện đã hết hàng'));
    });

    it('ER-02: Chặn khi số lượng yêu cầu vượt quá tồn kho còn lại (ví dụ còn 2 mà đòi mua 3)', () => {
      const validation = validateItemStockBeforeAdd(2, 3, 'Pizza hải sản');
      assert.strictEqual(validation.canAdd, false);
      assert.ok(validation.error?.includes('Chỉ còn lại 2 suất'));
    });

    it('ER-03: Chặn số lượng yêu cầu <= 0', () => {
      const validation = validateItemStockBeforeAdd(10, 0, 'Phở gà');
      assert.strictEqual(validation.canAdd, false);
      assert.strictEqual(validation.error, 'Số lượng phải lớn hơn 0');
    });
  });
});

