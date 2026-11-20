/**
 * @file search-bar-loading.test.ts
 * @description Unit tests for Two-tier Search Loading State, Suggestions Popover & Keyboard Navigation Logic
 * @traceability
 * - Issue: #87
 * - Plan: docs/plans/platform/smart-food-search-engine.md
 * - Target: frontend/src/features/search/components/SearchBar.tsx
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/** Pure function tính toán trạng thái loading 2 tầng của SearchBar */
export function calculateSearchLoadingState(params: {
  query: string;
  debouncedQuery: string;
  isFetchingSuggestions: boolean;
}): {
  isDebouncing: boolean;
  isFetching: boolean;
  isSearching: boolean;
} {
  const isDebouncing =
    params.query.trim() !== params.debouncedQuery.trim() &&
    params.query.trim().length > 0;

  const isFetching =
    params.isFetchingSuggestions && params.debouncedQuery.trim().length >= 2;

  const isSearching = isDebouncing || isFetching;

  return { isDebouncing, isFetching, isSearching };
}

/** Pure function kiểm tra điều kiện hiển thị Popover */
export function determinePopoverVisibility(params: {
  isFocused: boolean;
  query: string;
  historyLength: number;
}): {
  showHistory: boolean;
  showSuggestions: boolean;
  isPopoverOpen: boolean;
} {
  const trimmed = params.query.trim();
  const showSuggestions = params.isFocused && trimmed.length >= 2;
  const showHistory = params.isFocused && trimmed.length < 2 && params.historyLength > 0;
  const isPopoverOpen = showSuggestions || showHistory;

  return { showHistory, showSuggestions, isPopoverOpen };
}

/** Pure function điều hướng phím Lên/Xuống qua danh sách gợi ý */
export function navigateSuggestionsIndex(
  currentIndex: number,
  totalItems: number,
  direction: 'ArrowUp' | 'ArrowDown',
): number {
  if (totalItems <= 0) return -1;
  if (direction === 'ArrowDown') {
    return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
  }
  return currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
}

describe('SearchBar Loading & Popover Interactive State Suite (3-Branch Testing)', () => {
  // ==========================================
  // NHÁNH 1: HAPPY PATH (HP)
  // ==========================================
  describe('Nhánh 1: Happy Path (HP)', () => {
    it('HP-01: Người dùng gõ phím ("phở") -> isDebouncing kích hoạt ngay lập tức (Tầng 1)', () => {
      const state = calculateSearchLoadingState({
        query: 'phở',
        debouncedQuery: '',
        isFetchingSuggestions: false,
      });

      assert.equal(state.isDebouncing, true);
      assert.equal(state.isSearching, true);
    });

    it('HP-02: Hết thời gian debounce (300ms) -> isDebouncing tắt, isFetching kích hoạt (Tầng 2)', () => {
      const state = calculateSearchLoadingState({
        query: 'phở',
        debouncedQuery: 'phở',
        isFetchingSuggestions: true,
      });

      assert.equal(state.isDebouncing, false);
      assert.equal(state.isFetching, true);
      assert.equal(state.isSearching, true);
    });

    it('HP-03: Dữ liệu tải về hoàn tất -> Toàn bộ trạng thái loading tắt (isSearching = false)', () => {
      const state = calculateSearchLoadingState({
        query: 'phở',
        debouncedQuery: 'phở',
        isFetchingSuggestions: false,
      });

      assert.equal(state.isDebouncing, false);
      assert.equal(state.isFetching, false);
      assert.equal(state.isSearching, false);
    });

    it('HP-04: Ô tìm kiếm được focus và query >= 2 ký tự -> Hiển thị khối Autocomplete Suggestions', () => {
      const vis = determinePopoverVisibility({
        isFocused: true,
        query: 'bún bò',
        historyLength: 5,
      });

      assert.equal(vis.showSuggestions, true);
      assert.equal(vis.showHistory, false);
      assert.equal(vis.isPopoverOpen, true);
    });

    it('HP-05: Ô tìm kiếm được focus và query rỗng -> Hiển thị khối Lịch sử tìm kiếm', () => {
      const vis = determinePopoverVisibility({
        isFocused: true,
        query: '',
        historyLength: 3,
      });

      assert.equal(vis.showHistory, true);
      assert.equal(vis.showSuggestions, false);
      assert.equal(vis.isPopoverOpen, true);
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES (EC)
  // ==========================================
  describe('Nhánh 2: Edge Cases (EC)', () => {
    it('EC-01: Gõ phím chỉ có khoảng trắng ("   ") -> Không bật isDebouncing và không bật isSearching', () => {
      const state = calculateSearchLoadingState({
        query: '   ',
        debouncedQuery: '',
        isFetchingSuggestions: false,
      });

      assert.equal(state.isDebouncing, false);
      assert.equal(state.isSearching, false);
    });

    it('EC-02: Điều hướng phím mũi tên tuần hoàn (Wrap around): ArrowDown ở mục cuối -> quay về mục 0', () => {
      const nextIndex = navigateSuggestionsIndex(2, 3, 'ArrowDown');
      assert.equal(nextIndex, 0);
    });

    it('EC-03: Điều hướng phím mũi tên tuần hoàn: ArrowUp ở mục đầu (0) -> nhảy xuống mục cuối', () => {
      const nextIndex = navigateSuggestionsIndex(0, 5, 'ArrowUp');
      assert.equal(nextIndex, 4);
    });

    it('EC-04: Danh sách rỗng (0 items) điều hướng bàn phím trả về -1 an toàn', () => {
      assert.equal(navigateSuggestionsIndex(-1, 0, 'ArrowDown'), -1);
      assert.equal(navigateSuggestionsIndex(0, 0, 'ArrowUp'), -1);
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR & REJECTION FLOW (ER)
  // ==========================================
  describe('Nhánh 3: Error & Rejection Flow (ER)', () => {
    it('ER-01: Không focus ô tìm kiếm (isFocused = false) -> Popover đóng hoàn toàn dù có query hay history', () => {
      const vis = determinePopoverVisibility({
        isFocused: false,
        query: 'cơm tấm',
        historyLength: 4,
      });

      assert.equal(vis.isPopoverOpen, false);
    });

    it('ER-02: Lịch sử tìm kiếm rỗng (historyLength = 0) và query rỗng -> Không mở Popover lịch sử', () => {
      const vis = determinePopoverVisibility({
        isFocused: true,
        query: '',
        historyLength: 0,
      });

      assert.equal(vis.showHistory, false);
      assert.equal(vis.isPopoverOpen, false);
    });
  });
});
