'use client';

import { useSyncExternalStore, useCallback } from 'react';

const SEARCH_HISTORY_KEY = 'food_delivery_search_history';
const MAX_HISTORY_ITEMS = 10;
const EMPTY_HISTORY: string[] = [];

let cachedRaw: string | null = null;
let cachedHistory: string[] = EMPTY_HISTORY;
const listeners = new Set<() => void>();

function getSnapshot(): string[] {
  if (typeof window === 'undefined') return EMPTY_HISTORY;
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (raw === cachedRaw) return cachedHistory;
    cachedRaw = raw;
    if (!raw) {
      cachedHistory = EMPTY_HISTORY;
      return cachedHistory;
    }
    const parsed = JSON.parse(raw);
    cachedHistory = Array.isArray(parsed)
      ? (parsed.slice(0, MAX_HISTORY_ITEMS) as string[])
      : EMPTY_HISTORY;
    return cachedHistory;
  } catch {
    return EMPTY_HISTORY;
  }
}

function getServerSnapshot(): string[] {
  return EMPTY_HISTORY;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SEARCH_HISTORY_KEY) {
      cachedRaw = null;
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function notify(): void {
  cachedRaw = null;
  listeners.forEach((listener) => listener());
}

export interface UseSearchHistoryResult {
  history: string[];
  addHistory: (keyword: string) => void;
  removeHistory: (keyword: string) => void;
  clearHistory: () => void;
  isLoaded: boolean;
}

/**
 * Custom hook quản lý lịch sử tìm kiếm người dùng trong localStorage.
 * Sử dụng useSyncExternalStore chuẩn React 18/19 tránh cascading render và hydration mismatch.
 */
export function useSearchHistory(): UseSearchHistoryResult {
  const history = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addHistory = useCallback((keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed || typeof window === 'undefined') return;

    try {
      const current = getSnapshot();
      const filtered = current.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase(),
      );
      const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      notify();
    } catch {
      // Bỏ qua lỗi storage quota
    }
  }, []);

  const removeHistory = useCallback((keyword: string) => {
    if (typeof window === 'undefined') return;

    try {
      const current = getSnapshot();
      const updated = current.filter(
        (item) => item.toLowerCase() !== keyword.toLowerCase(),
      );
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      notify();
    } catch {
      // Bỏ qua lỗi
    }
  }, []);

  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
      notify();
    } catch {
      // Bỏ qua lỗi
    }
  }, []);

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
    isLoaded: true,
  };
}
