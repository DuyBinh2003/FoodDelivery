'use client';

import { useQuery } from '@tanstack/react-query';
import type { MenuSearchParams } from '@/features/search/types';
import { getCategories, getTags, getMenuItems } from '@/features/search/api';

/**
 * Query key factory — chuẩn hoá key cho invalidation & refetch.
 *
 * @example
 * // Invalidate toàn bộ search queries
 * queryClient.invalidateQueries({ queryKey: searchKeys.all });
 *
 * // Invalidate chỉ menu queries
 * queryClient.invalidateQueries({ queryKey: searchKeys.menu() });
 */
export const searchKeys = {
  all: ['search'] as const,
  categories: () => [...searchKeys.all, 'categories'] as const,
  tags: () => [...searchKeys.all, 'tags'] as const,
  menu: (params?: MenuSearchParams) =>
    [...searchKeys.all, 'menu', params] as const,
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
