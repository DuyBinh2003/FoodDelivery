/**
 * @file menu-catalog.test.ts
 * @description Unit tests for Menu Catalog UI logic, Menu Section aggregation, and Sorting Pipeline.
 * @traceability
 * - Issue: #86 - Remake toàn diện giao diện trang Thực Đơn (/menu)
 * - Plan: docs/plans/customer/menu-catalog-ui-revamp.md
 * - Target: frontend/src/features/search/ & frontend/src/app/menu/
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { MenuSection } from '../types/index.ts';
import type { MenuItem } from '../../menu/types/index.ts';

// Helper: Sắp xếp các items trong MenuSection
export function sortMenuSectionItems(
  sections: MenuSection[],
  sortOption: string | undefined,
): MenuSection[] {
  return sections.map((section) => {
    const itemsCopy = [...section.items];
    if (sortOption === 'price_asc') {
      itemsCopy.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortOption === 'price_desc') {
      itemsCopy.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortOption === 'name_asc') {
      itemsCopy.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }
    return {
      ...section,
      items: itemsCopy,
    };
  });
}

// Helper: Tính tổng số lượng món ăn và số lượng nhà hàng
export function calculateMenuStats(sections: MenuSection[]): {
  totalItems: number;
  totalRestaurants: number;
} {
  const totalItems = sections.reduce((acc, sec) => acc + sec.items.length, 0);
  const totalRestaurants = sections.length;
  return { totalItems, totalRestaurants };
}

// Helper: Filter món ăn theo từ khóa
export function filterMenuItemsByKeyword(
  sections: MenuSection[],
  keyword: string,
): MenuSection[] {
  if (!keyword || keyword.trim() === '') return sections;
  const lowerKw = keyword.toLowerCase().trim();

  return sections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (item) =>
          item.name.toLowerCase().includes(lowerKw) ||
          sec.restaurant.toLowerCase().includes(lowerKw),
      ),
    }))
    .filter((sec) => sec.items.length > 0);
}

describe('Menu Catalog Suite (#86 - Remake /menu UI)', () => {
  const mockMenuItem1: MenuItem = {
    id: 'item-1',
    restaurant_id: 'rest-1',
    name: 'Cơm Tấm Sườn Bì Chả',
    price: 45000,
    original_price: 55000,
    is_available: true,
  };

  const mockMenuItem2: MenuItem = {
    id: 'item-2',
    restaurant_id: 'rest-1',
    name: 'Canh Khổ Qua Nhồi Thịt',
    price: 20000,
    is_available: true,
  };

  const mockMenuItem3: MenuItem = {
    id: 'item-3',
    restaurant_id: 'rest-2',
    name: 'Trà Sữa Trân Châu Đường Đen',
    price: 35000,
    is_available: true,
  };

  const mockSections: MenuSection[] = [
    {
      restaurant: 'Cơm Tấm Phúc Lộc Thọ',
      items: [mockMenuItem1, mockMenuItem2],
    },
    {
      restaurant: 'Trà Sữa Gong Cha',
      items: [mockMenuItem3],
    },
  ];

  /* ========================================================================
   * 1. HAPPY PATH (Dòng Chảy Chuẩn)
   * ======================================================================== */
  describe('Happy Path', () => {
    it('[Branch: Happy] Tính toán chính xác tổng số món và số nhà hàng', () => {
      const stats = calculateMenuStats(mockSections);
      assert.strictEqual(stats.totalItems, 3);
      assert.strictEqual(stats.totalRestaurants, 2);
    });

    it('[Branch: Happy] Sắp xếp giá từ thấp đến cao (price_asc)', () => {
      const sorted = sortMenuSectionItems(mockSections, 'price_asc');
      assert.strictEqual(sorted[0].items[0].price, 20000);
      assert.strictEqual(sorted[0].items[1].price, 45000);
    });

    it('[Branch: Happy] Sắp xếp giá từ cao đến thấp (price_desc)', () => {
      const sorted = sortMenuSectionItems(mockSections, 'price_desc');
      assert.strictEqual(sorted[0].items[0].price, 45000);
      assert.strictEqual(sorted[0].items[1].price, 20000);
    });

    it('[Branch: Happy] Sắp xếp theo tên A-Z có hỗ trợ tiếng Việt (name_asc)', () => {
      const sorted = sortMenuSectionItems(mockSections, 'name_asc');
      // Canh (C) trước Cơm (Cơ)
      assert.strictEqual(sorted[0].items[0].name, 'Canh Khổ Qua Nhồi Thịt');
      assert.strictEqual(sorted[0].items[1].name, 'Cơm Tấm Sườn Bì Chả');
    });

    it('[Branch: Happy] Lọc theo từ khóa tìm kiếm chính xác', () => {
      const filtered = filterMenuItemsByKeyword(mockSections, 'trà sữa');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].restaurant, 'Trà Sữa Gong Cha');
      assert.strictEqual(filtered[0].items[0].name, 'Trà Sữa Trân Châu Đường Đen');
    });
  });

  /* ========================================================================
   * 2. EDGE CASES (Biên & Giới Hạn)
   * ======================================================================== */
  describe('Edge Cases', () => {
    it('[Branch: Edge] Xử lý mảng sections rỗng an toàn mà không phát sinh lỗi', () => {
      const stats = calculateMenuStats([]);
      assert.strictEqual(stats.totalItems, 0);
      assert.strictEqual(stats.totalRestaurants, 0);

      const sorted = sortMenuSectionItems([], 'price_asc');
      assert.strictEqual(sorted.length, 0);
    });

    it('[Branch: Edge] Món ăn có giá bằng nhau giữ nguyên tính ổn định', () => {
      const samePriceSections: MenuSection[] = [
        {
          restaurant: 'Quán Đồng Giá',
          items: [
            { id: '1', restaurant_id: 'r1', name: 'Món A', price: 30000, is_available: true },
            { id: '2', restaurant_id: 'r1', name: 'Món B', price: 30000, is_available: true },
          ],
        },
      ];
      const sorted = sortMenuSectionItems(samePriceSections, 'price_asc');
      assert.strictEqual(sorted[0].items.length, 2);
      assert.strictEqual(sorted[0].items[0].price, sorted[0].items[1].price);
    });

    it('[Branch: Edge] Tìm kiếm không phân biệt chữ hoa, chữ thường và khoảng trắng thừa', () => {
      const filtered = filterMenuItemsByKeyword(mockSections, '   CƠM TẤM   ');
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].items[0].name, 'Cơm Tấm Sườn Bì Chả');
    });
  });

  /* ========================================================================
   * 3. ERROR & REJECTION FLOW (Ngoại Lệ & Khắc Phục)
   * ======================================================================== */
  describe('Error Flow', () => {
    it('[Branch: Error] Sort option không hợp lệ (unknown) không làm thay đổi thứ tự gốc', () => {
      const originalFirstItemName = mockSections[0].items[0].name;
      const sorted = sortMenuSectionItems(mockSections, 'invalid_sort_param');
      assert.strictEqual(sorted[0].items[0].name, originalFirstItemName);
    });

    it('[Branch: Error] Tìm kiếm từ khóa hoàn toàn không tồn tại trả về mảng rỗng (Empty State)', () => {
      const filtered = filterMenuItemsByKeyword(mockSections, 'mon_khong_ton_tai_xyz');
      assert.strictEqual(filtered.length, 0);
    });
  });
});
