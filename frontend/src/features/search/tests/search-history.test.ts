/**
 * @file search-history.test.ts
 * @description Unit tests for Search History Management (Save, Deduplicate, Remove Single, Clear All)
 * @traceability
 * - Issue: #87
 * - Plan: docs/plans/platform/smart-food-search-engine.md
 * - Target: frontend/src/features/search/hooks/use-search-history.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const MAX_HISTORY_ITEMS = 10;

/** Pure function mô phỏng logic thêm từ khóa vào lịch sử */
export function addSearchHistory(current: string[], keyword: string): string[] {
  const trimmed = keyword.trim();
  if (!trimmed) return current;
  const filtered = current.filter(
    (item) => item.toLowerCase() !== trimmed.toLowerCase(),
  );
  return [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
}

/** Pure function mô phỏng logic xóa 1 từ khóa khỏi lịch sử */
export function removeSearchHistory(current: string[], keyword: string): string[] {
  return current.filter(
    (item) => item.toLowerCase() !== keyword.toLowerCase(),
  );
}

/** Pure function mô phỏng logic xóa toàn bộ lịch sử */
export function clearSearchHistory(): string[] {
  return [];
}

/** Pure function mô phỏng parse dữ liệu an toàn từ raw JSON */
export function parseStoredHistory(rawJson: string | null): string[] {
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, MAX_HISTORY_ITEMS);
    }
    return [];
  } catch {
    return [];
  }
}

describe('Search History Management Suite (3-Branch Testing)', () => {
  // ==========================================
  // NHÁNH 1: HAPPY PATH (HP)
  // ==========================================
  describe('Nhánh 1: Happy Path (HP)', () => {
    it('HP-01: Thêm từ khóa mới vào danh sách lịch sử thành công', () => {
      const initial: string[] = ['Trà sữa', 'Gà rán'];
      const result = addSearchHistory(initial, 'Cơm tấm');

      assert.equal(result.length, 3);
      assert.equal(result[0], 'Cơm tấm');
      assert.equal(result[1], 'Trà sữa');
      assert.equal(result[2], 'Gà rán');
    });

    it('HP-02: Xóa một từ khóa cụ thể khỏi danh sách lịch sử', () => {
      const initial: string[] = ['Cơm tấm', 'Trà sữa', 'Bún bò'];
      const result = removeSearchHistory(initial, 'Trà sữa');

      assert.equal(result.length, 2);
      assert.deepEqual(result, ['Cơm tấm', 'Bún bò']);
    });

    it('HP-03: Xóa toàn bộ lịch sử trả về mảng rỗng', () => {
      const result = clearSearchHistory();
      assert.equal(result.length, 0);
      assert.deepEqual(result, []);
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES (EC)
  // ==========================================
  describe('Nhánh 2: Edge Cases (EC)', () => {
    it('EC-01: Thêm từ khóa đã tồn tại trong lịch sử -> Không trùng lặp và đưa lên vị trí số 1 (deduplicate)', () => {
      const initial: string[] = ['Bún bò', 'Trà sữa', 'Cơm tấm'];
      const result = addSearchHistory(initial, 'Cơm tấm');

      assert.equal(result.length, 3);
      assert.equal(result[0], 'Cơm tấm');
      assert.equal(result[1], 'Bún bò');
      assert.equal(result[2], 'Trà sữa');
    });

    it('EC-02: Lưu vượt quá 10 từ khóa -> Tự động cắt bỏ từ khóa cũ nhất để duy trì tối đa 10 mục (FIFO)', () => {
      const initial: string[] = [
        'Món 1', 'Món 2', 'Món 3', 'Món 4', 'Món 5',
        'Món 6', 'Món 7', 'Món 8', 'Món 9', 'Món 10'
      ];
      const result = addSearchHistory(initial, 'Món Mới');

      assert.equal(result.length, MAX_HISTORY_ITEMS);
      assert.equal(result[0], 'Món Mới');
      assert.equal(result[result.length - 1], 'Món 9');
      assert.ok(!result.includes('Món 10'));
    });

    it('EC-03: Từ khóa có khoảng trắng đầu cuối -> Tự động trim sạch trước khi lưu', () => {
      const initial: string[] = ['Phở'];
      const result = addSearchHistory(initial, '   Bún chả Hà Nội   ');

      assert.equal(result[0], 'Bún chả Hà Nội');
      assert.equal(result.length, 2);
    });

    it('EC-04: Từ khóa chỉ chứa khoảng trắng rỗng -> Bỏ qua không thêm vào danh sách', () => {
      const initial: string[] = ['Phở'];
      const result = addSearchHistory(initial, '     ');

      assert.deepEqual(result, ['Phở']);
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR & REJECTION FLOW (ER)
  // ==========================================
  describe('Nhánh 3: Error & Rejection Flow (ER)', () => {
    it('ER-01: Xóa một từ khóa không tồn tại trong danh sách -> Giữ nguyên mảng hiện tại mà không văng lỗi', () => {
      const initial: string[] = ['Cơm tấm', 'Bún bò'];
      const result = removeSearchHistory(initial, 'Pizza');

      assert.deepEqual(result, ['Cơm tấm', 'Bún bò']);
    });

    it('ER-02: Dữ liệu trong storage bị hỏng (corrupted JSON) -> Parse an toàn trả về mảng rỗng []', () => {
      const corruptedJson = '{invalid_json...';
      const result = parseStoredHistory(corruptedJson);

      assert.deepEqual(result, []);
    });

    it('ER-03: Dữ liệu raw là null hoặc empty string -> Trả về mảng rỗng an toàn', () => {
      assert.deepEqual(parseStoredHistory(null), []);
      assert.deepEqual(parseStoredHistory(''), []);
    });
  });
});
