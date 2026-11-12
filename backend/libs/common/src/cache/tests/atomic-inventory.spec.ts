/**
 * @requirement Issue #81 - High Concurrency Cache Stampede & Atomic Lua Inventory Deduction
 * @scenario Atomic Inventory Lua Deduction Suite (3-Branch Testing)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AtomicInventoryService } from '@/common/cache/atomic-inventory.service.js';

describe('Atomic Lua Inventory Deduction Suite (#81)', () => {
  let inventoryService: AtomicInventoryService;

  beforeEach(() => {
    inventoryService = new AtomicInventoryService();
  });

  describe('🟢 Nhánh 1: Happy Path', () => {
    it('HP-01: Khởi tạo tồn kho và trừ số lượng nguyên tử thành công', async () => {
      /**
       * @requirement Issue #81
       * @scenario Set kho 10 suất, trừ 3 suất
       * @expected Thành công, số còn lại là 7
       */
      const itemId = 'dish-tra-sua-01';
      await inventoryService.setStock(itemId, 10);

      const checkStock = await inventoryService.getStock(itemId);
      expect(checkStock).toBe(10);

      const deductRes = await inventoryService.deductStock(itemId, 3);
      expect(deductRes.success).toBe(true);
      expect(deductRes.remaining).toBe(7);

      const remainingStock = await inventoryService.getStock(itemId);
      expect(remainingStock).toBe(7);
    });

    it('HP-02: Tăng tồn kho khi hủy đơn thành công', async () => {
      /**
       * @requirement Issue #81
       * @scenario Hoàn lại 4 suất vào kho đang có 5 suất
       * @expected Tồn kho mới là 9
       */
      const itemId = 'dish-pho-bo-02';
      await inventoryService.setStock(itemId, 5);

      const updated = await inventoryService.increaseStock(itemId, 4);
      expect(updated).toBe(9);

      const current = await inventoryService.getStock(itemId);
      expect(current).toBe(9);
    });
  });

  describe('🟡 Nhánh 2: Edge Cases (Anti-Overselling & Concurrency)', () => {
    it('EC-01: Chống Overselling: 20 requests đồng thời mua 1 suất cuối cùng -> Đúng 1 thành công, tồn kho về 0', async () => {
      /**
       * @requirement Issue #81
       * @scenario 20 requests cùng trừ 1 suất khi kho chỉ còn 1
       * @expected Đúng 1 request thành công, 19 requests nhận thất bại, stock = 0 (tuyệt đối không âm)
       */
      const flashSaleItem = 'dish-flash-sale-1d';
      await inventoryService.setStock(flashSaleItem, 1);

      // Bắn 20 requests đồng thời
      const promises = Array.from({ length: 20 }).map(() =>
        inventoryService.deductStock(flashSaleItem, 1),
      );

      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(19);

      const finalStock = await inventoryService.getStock(flashSaleItem);
      expect(finalStock).toBe(0); // KHÔNG BAO GIỜ BỊ ÂM!
    });

    it('EC-02: Trừ số lượng bằng đúng số lượng tồn kho còn lại -> Thành công và tồn kho chạm mốc 0', async () => {
      /**
       * @requirement Issue #81
       * @scenario Còn 5 suất, mua hết 5 suất
       * @expected success = true, remaining = 0
       */
      const itemId = 'dish-exact-match';
      await inventoryService.setStock(itemId, 5);

      const res = await inventoryService.deductStock(itemId, 5);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(0);
    });
  });

  describe('🔴 Nhánh 3: Error & Rejection Flow', () => {
    it('ER-01: Món ăn chưa được khởi tạo tồn kho trong hệ thống -> Trả về notFound = true', async () => {
      /**
       * @requirement Issue #81
       * @scenario Item chưa có trong kho Redis
       * @expected notFound = true, success = false
       */
      const res = await inventoryService.deductStock('unknown-item-xyz', 1);
      expect(res.success).toBe(false);
      expect(res.notFound).toBe(true);
    });

    it('ER-02: Yêu cầu trừ số lượng lớn hơn số tồn kho hiện có -> Trả về success = false', async () => {
      /**
       * @requirement Issue #81
       * @scenario Kho còn 2 suất, khách đòi mua 5 suất
       * @expected success = false, remaining = 2 (không bị trừ hụt)
       */
      const itemId = 'dish-limited';
      await inventoryService.setStock(itemId, 2);

      const res = await inventoryService.deductStock(itemId, 5);
      expect(res.success).toBe(false);
      expect(res.remaining).toBe(2);

      const check = await inventoryService.getStock(itemId);
      expect(check).toBe(2); // Vẫn bảo toàn 2 suất
    });
  });
});

