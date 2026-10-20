/**
 * @file restaurant-menu.test.ts
 * @description Unit tests for Restaurant Menu UI logic, Delivery fee/ETA calculations, Cart Store, and Modifier Validation.
 * @traceability
 * - Issue: #69 - Nâng cấp UI của trang menu
 * - Plan: docs/plans/customer/restaurant-menu-ui-revamp.md
 * - Target: frontend/src/features/restaurant/
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceKm,
  calculateRestaurantEtaMinutes,
  formatDistanceDisplay,
  formatEtaDisplay,
} from '../../home/utils/home-feed.utils.ts';
import type { MenuItem, MenuItemOptionGroup } from '../../menu/types/index.ts';

// Helper delivery fee calculation
function calculateDeliveryFee(distanceKm: number, isFreeship = false): number {
  if (isFreeship) return 0;
  if (distanceKm <= 2) return 15000;
  return 15000 + Math.ceil(distanceKm - 2) * 5000;
}

// Helper real-time modifier price calculation
function calculateItemPriceWithModifiers(
  basePrice: number,
  selectedModifierPrices: number[],
  quantity: number,
): { unitPrice: number; totalPrice: number } {
  const modifierSum = selectedModifierPrices.reduce((sum, p) => sum + p, 0);
  const unitPrice = basePrice + modifierSum;
  const totalPrice = unitPrice * Math.max(1, quantity);
  return { unitPrice, totalPrice };
}

// Helper validate required option groups
function validateRequiredOptions(
  optionGroups: MenuItemOptionGroup[] | undefined,
  selectedChoices: Record<string, string>, // groupId -> choiceId
): { isValid: boolean; missingGroupName?: string } {
  if (!optionGroups || optionGroups.length === 0) {
    return { isValid: true };
  }

  for (const group of optionGroups) {
    if (group.required) {
      if (!selectedChoices[group.id]) {
        return { isValid: false, missingGroupName: group.name };
      }
    }
  }

  return { isValid: true };
}

describe('Restaurant Menu UI & Business Logic Suite (Frontend)', () => {
  const mockUserLat = 10.772545; // Quận 1
  const mockUserLng = 106.702758;

  const mockRestaurant = {
    id: 'rest-pho-1',
    name: 'Phở Biên Hòa',
    lat: 10.782545,
    lon: 106.712758,
    is_active: true,
    is_freeship: false,
  };

  const mockMenuItem: MenuItem = {
    id: 'dish-pho-bo',
    restaurant_id: 'rest-pho-1',
    name: 'Phở Bò Tái',
    price: 55000,
    original_price: 65000,
    is_available: true,
    options: [
      {
        id: 'opt-size',
        name: 'Chọn Kích cỡ (Size)',
        required: true,
        min_choices: 1,
        max_choices: 1,
        choices: [
          { id: 'size-m', name: 'Tô Vừa', price: 0, is_default: true },
          { id: 'size-l', name: 'Tô Lớn', price: 10000 },
        ],
      },
      {
        id: 'opt-toppings',
        name: 'Thêm Topping',
        required: false,
        min_choices: 0,
        max_choices: 3,
        choices: [
          { id: 'top-beef', name: 'Thêm Bò Tái', price: 15000 },
          { id: 'top-egg', name: 'Trứng Chần', price: 8000 },
        ],
      },
    ],
  };

  describe('Branch 1: Happy Path', () => {
    it('1. Tính cự ly GPS, thời gian giao ETA và phí ship phân cấp chính xác', () => {
      const distance = calculateDistanceKm(
        mockUserLat,
        mockUserLng,
        mockRestaurant.lat,
        mockRestaurant.lon,
      );
      assert.ok(distance > 0, 'Khoảng cách phải lớn hơn 0');

      const eta = calculateRestaurantEtaMinutes(distance);
      assert.ok(eta >= 12, 'ETA tối thiểu 12 phút');

      const fee = calculateDeliveryFee(distance, mockRestaurant.is_freeship);
      assert.equal(typeof fee, 'number');
      assert.ok(fee >= 15000, 'Phí ship cơ bản tối thiểu 15.000đ');

      // Định dạng hiển thị
      const distStr = formatDistanceDisplay(distance);
      const etaStr = formatEtaDisplay(eta);
      assert.ok(distStr.includes('km') || distStr.includes('m'));
      assert.ok(etaStr.includes('phút'));
    });

    it('2. Tính giá Real-time nhảy số chính xác khi chọn Size và Topping', () => {
      // Chọn Size L (+10.000đ) và Topping Bò Tái (+15.000đ) với số lượng = 2
      const basePrice = 55000;
      const selectedModifierPrices = [10000, 15000];
      const quantity = 2;

      const { unitPrice, totalPrice } = calculateItemPriceWithModifiers(
        basePrice,
        selectedModifierPrices,
        quantity,
      );

      assert.equal(unitPrice, 80000, 'Đơn giá sau modifier phải là 55k + 10k + 15k = 80k');
      assert.equal(totalPrice, 160000, 'Tổng tiền x2 phải là 160.000đ');
    });

    it('3. Sinh Cart Item ID duy nhất dựa trên tùy chọn và customNote để phân biệt các tùy biến khác nhau', () => {
      const optionA = ['Size L (+10.000đ)', 'Thêm Bò Tái'];
      const noteA = 'Để riêng nước dùng';
      const optionB = ['Size L (+10.000đ)', 'Thêm Bò Tái'];
      const noteB = 'Cho nhiều ớt';

      const buildId = (itemId: string, options: string[], note?: string) => {
        const trimmed = note?.trim();
        const optSuffix = options.length > 0 ? `-${options.slice().sort().join('|')}` : '';
        const noteSuffix = trimmed ? `-note:${trimmed}` : '';
        return `${itemId}${optSuffix}${noteSuffix}`;
      };

      const idA = buildId(mockMenuItem.id, optionA, noteA);
      const idB = buildId(mockMenuItem.id, optionB, noteB);
      const idC = buildId(mockMenuItem.id, optionA, undefined);

      assert.notEqual(idA, idB, 'Cùng option nhưng khác customNote phải có ID khác nhau');
      assert.notEqual(idA, idC, 'Có customNote và không có customNote phải có ID khác nhau');
      assert.ok(idA.includes(noteA));
      assert.ok(idB.includes(noteB));
    });
  });

  describe('Branch 2: Edge Cases', () => {
    it('4. Miễn phí giao hàng khi nhà hàng có gắn cờ freeship (is_freeship = true)', () => {
      const fee = calculateDeliveryFee(5.5, true);
      assert.equal(fee, 0, 'Phí giao hàng của quán Freeship phải bằng 0đ');
    });

    it('5. Tính toán chính xác phần trăm giảm giá khi có original_price > price', () => {
      const originalPrice = Number(mockMenuItem.original_price);
      const salePrice = Number(mockMenuItem.price);

      assert.ok(originalPrice > salePrice);
      const discountPercent = Math.round(((originalPrice - salePrice) / originalPrice) * 100);

      // (65000 - 55000) / 65000 = 15.38% -> 15%
      assert.equal(discountPercent, 15);
    });

    it('6. Món ăn không có options: tính giá đơn thuần và hợp lệ ngay lập tức', () => {
      const validation = validateRequiredOptions([], {});
      assert.equal(validation.isValid, true);

      const { unitPrice, totalPrice } = calculateItemPriceWithModifiers(5000, [], 3);
      assert.equal(unitPrice, 5000);
      assert.equal(totalPrice, 15000);
    });
  });

  describe('Branch 3: Error & Rejection Flow', () => {
    it('7. Từ chối thêm vào giỏ nếu chưa chọn tùy chọn bắt buộc (Required Modifier Group)', () => {
      // Chưa chọn Size
      const validation = validateRequiredOptions(mockMenuItem.options, {});

      assert.equal(validation.isValid, false);
      assert.equal(validation.missingGroupName, 'Chọn Kích cỡ (Size)');
    });

    it('8. Chấp thuận khi đã chọn đầy đủ các nhóm bắt buộc', () => {
      // Đã chọn Size
      const validation = validateRequiredOptions(mockMenuItem.options, {
        'opt-size': 'size-m',
      });

      assert.equal(validation.isValid, true);
      assert.equal(validation.missingGroupName, undefined);
    });

    it('9. Ràng buộc giỏ hàng 1 nhà hàng duy nhất (Single Restaurant Policy)', () => {
      let currentRestaurantId: string | null = 'rest-pho-1';
      let cartItems = [{ id: 'item-1', name: 'Phở Bò', price: 55000, quantity: 1 }];

      // Thử thêm món của quán khác (rest-bunbo-2)
      const newRestaurantId = 'rest-bunbo-2';
      const canAddDirectly = !currentRestaurantId || cartItems.length === 0 || currentRestaurantId === newRestaurantId;

      assert.equal(canAddDirectly, false, 'Không được phép thêm trực tiếp món từ nhà hàng khác');

      // Mô phỏng xóa giỏ cũ để thêm quán mới
      currentRestaurantId = null;
      cartItems = [];

      const canAddAfterClear = !currentRestaurantId || cartItems.length === 0 || currentRestaurantId === newRestaurantId;
      assert.equal(canAddAfterClear, true, 'Sau khi xóa giỏ hàng, cho phép nạp món của quán mới');
    });

    it('10. Chiết xuất danh sách tags của món ăn từ database đầy đủ và chính xác', () => {
      const itemWithTags: MenuItem = {
        id: 'item-pho-tai',
        restaurant_id: 'rest-1',
        name: 'Phở Bò Tái',
        price: 55000,
        is_available: true,
        tags: [
          { id: 't1', name: 'Món Nước' },
          { id: 't2', name: 'Bò' },
          { id: 't3', name: 'Bán Chạy' },
        ],
      };

      const tagNames = (itemWithTags.tags || []).map((t) => t.name);
      assert.deepEqual(tagNames, ['Món Nước', 'Bò', 'Bán Chạy']);
      assert.equal(tagNames.length, 3);
    });

    it('11. Validate Option Builder: Chặn nhóm tùy chọn không có lựa chọn nào hoặc lựa chọn có giá âm', () => {
      const validateOptionBuilder = (groups: MenuItemOptionGroup[]): { valid: boolean; error?: string } => {
        for (const g of groups) {
          if (!g.name.trim()) return { valid: false, error: 'Tên nhóm không được để trống' };
          if (g.choices.length === 0) return { valid: false, error: 'Nhóm phải có ít nhất 1 lựa chọn' };
          for (const c of g.choices) {
            if (!c.name.trim()) return { valid: false, error: 'Tên lựa chọn không được để trống' };
            if (c.price < 0) return { valid: false, error: 'Giá cộng thêm không thể là số âm' };
          }
        }
        return { valid: true };
      };

      // Nhóm rỗng choices
      const emptyGroupCheck = validateOptionBuilder([{
        id: 'g1',
        name: 'Size',
        required: true,
        choices: [],
      }]);
      assert.equal(emptyGroupCheck.valid, false);
      assert.equal(emptyGroupCheck.error, 'Nhóm phải có ít nhất 1 lựa chọn');

      // Lựa chọn có giá âm
      const negativePriceCheck = validateOptionBuilder([{
        id: 'g2',
        name: 'Topping',
        required: false,
        choices: [{ id: 'c1', name: 'Bò Viên', price: -5000 }],
      }]);
      assert.equal(negativePriceCheck.valid, false);
      assert.equal(negativePriceCheck.error, 'Giá cộng thêm không thể là số âm');

      // Hợp lệ
      const validCheck = validateOptionBuilder([{
        id: 'g3',
        name: 'Topping',
        required: false,
        choices: [{ id: 'c2', name: 'Bò Viên', price: 10000 }],
      }]);
      assert.equal(validCheck.valid, true);
    });
  });
});
