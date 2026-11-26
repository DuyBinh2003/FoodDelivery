import { apiClient } from '@/lib/api-client';
import type {
  Category,
  Tag,
  MenuSection,
  MenuSearchParams,
  PaginatedMenuResponse,
  SearchSuggestionResult,
} from '@/features/search/types';
import { normalizePaginatedMenuResponse } from '@/features/search/utils/menu-catalog.utils';

/**
 * Server-side: Fetch danh sách categories.
 */
export async function getCategories(): Promise<Category[]> {
  try {
    return await apiClient<Category[]>('/api/search/categories', {
      next: { revalidate: 60 } as NextFetchRequestConfig,
    });
  } catch (error: unknown) {
    console.warn('[SearchAPI] Failed to fetch categories from search-service:', error);
    return [];
  }
}

/**
 * Server-side: Fetch danh sách tags.
 */
export async function getTags(): Promise<Tag[]> {
  try {
    return await apiClient<Tag[]>('/api/search/tags', {
      next: { revalidate: 60 } as NextFetchRequestConfig,
    });
  } catch (error: unknown) {
    console.warn('[SearchAPI] Failed to fetch tags from search-service:', error);
    return [];
  }
}

function buildSearchQueryParams(
  searchParams?: MenuSearchParams,
): Record<string, string | undefined> {
  return {
    q: searchParams?.q,
    category: searchParams?.category,
    tag: searchParams?.tag,
    promo: searchParams?.promo,
    lat: searchParams?.lat !== undefined ? String(searchParams.lat) : undefined,
    lon: searchParams?.lon !== undefined ? String(searchParams.lon) : undefined,
    radius: searchParams?.radius,
    sort_by: searchParams?.sort_by,
    open_only: searchParams?.open_only ? 'true' : undefined,
    page: searchParams?.page !== undefined ? String(searchParams.page) : undefined,
    limit: searchParams?.limit !== undefined ? String(searchParams.limit) : undefined,
  };
}

/**
 * Legacy helper: Fetch menu sections (chuẩn hóa chống crash nếu Circuit Breaker trả object fallback).
 */
export async function getMenuItems(
  searchParams?: MenuSearchParams,
): Promise<MenuSection[]> {
  const raw = await apiClient<unknown>('/api/search/menu', {
    params: buildSearchQueryParams(searchParams),
    cache: 'no-store',
  });
  return normalizePaginatedMenuResponse(raw).sections;
}

/**
 * Fetch thực đơn có phân trang theo cụm nhà hàng cho Infinite Lazy Load trên /menu.
 */
export async function getPaginatedMenuItems(
  searchParams?: MenuSearchParams,
  signal?: AbortSignal,
): Promise<PaginatedMenuResponse> {
  const page = Math.max(1, searchParams?.page ?? 1);
  const limit = Math.min(30, Math.max(1, searchParams?.limit ?? 8));

  const raw = await apiClient<unknown>('/api/search/menu/paginated', {
    params: buildSearchQueryParams({ ...searchParams, page, limit }),
    cache: 'no-store',
    signal,
  });

  return normalizePaginatedMenuResponse(raw, page, limit);
}

/**
 * Client-side: Gợi ý tìm kiếm tức thời (Autocomplete Suggestions).
 */
export async function getSearchSuggestions(
  query: string,
  lat?: number,
  lon?: number,
  signal?: AbortSignal,
): Promise<SearchSuggestionResult> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return { keywords: [], dishes: [], restaurants: [] };
  }

  const queryParams: Record<string, string | undefined> = { q: trimmed };
  if (lat !== undefined && lon !== undefined) {
    queryParams.lat = String(lat);
    queryParams.lon = String(lon);
  }

  return await apiClient<SearchSuggestionResult>('/api/search/suggestions', {
    params: queryParams,
    signal,
  });
}
