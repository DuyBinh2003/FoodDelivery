'use client';

import { useQuery } from '@tanstack/react-query';
import type { MenuSearchParams, SearchSuggestionResult } from '@/features/search/types';
import { getCategories, getTags, getMenuItems, getSearchSuggestions } from '@/features/search/api';

/**
 * Query key factory — chuẩn hoá key cho invalidation & refetch.
 */
export const searchKeys = {
  all: ['search'] as const,
  categories: () => [...searchKeys.all, 'categories'] as const,
  tags: () => [...searchKeys.all, 'tags'] as const,
  menu: (params?: MenuSearchParams) =>
    [...searchKeys.all, 'menu', params] as const,
  suggestions: (query: string, lat?: number, lon?: number) =>
    [...searchKeys.all, 'suggestions', query, lat, lon] as const,
};

/** Hook: Fetch danh sách categories (Client-side) */
export function useCategories() {
  return useQuery({
    queryKey: searchKeys.categories(),
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000, // 5 phút
  });
}

/** Hook: Fetch danh sách tags (Client-side) */
export function useTags() {
  return useQuery({
    queryKey: searchKeys.tags(),
    queryFn: getTags,
    staleTime: 5 * 60 * 1000,
  });
}

/** Hook: Fetch menu items với search params (Client-side) */
export function useMenuItems(params?: MenuSearchParams) {
  return useQuery({
    queryKey: searchKeys.menu(params),
    queryFn: () => getMenuItems(params),
  });
}

/**
 * Hook: Gợi ý tìm kiếm tức thời (Autocomplete Suggestions).
 * Tích hợp AbortSignal của TanStack Query chống race condition khi người dùng gõ phím nhanh.
 */
export function useSearchSuggestions(
  query: string,
  lat?: number,
  lon?: number,
) {
  const trimmed = (query || '').trim();
  return useQuery<SearchSuggestionResult>({
    queryKey: searchKeys.suggestions(trimmed, lat, lon),
    queryFn: ({ signal }) => getSearchSuggestions(trimmed, lat, lon, signal),
    enabled: trimmed.length >= 2,
    staleTime: 30 * 1000, // Cache gợi ý 30s
    placeholderData: (previousData) => previousData,
  });
}
