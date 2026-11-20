import { apiClient } from '@/lib/api-client';
import type {
  Category,
  Tag,
  MenuSection,
  MenuSearchParams,
  SearchSuggestionResult,
} from '@/features/search/types';

/**
 * Server-side: Fetch danh sách categories.
 * Dùng Next.js revalidate để cache 60 giây.
 */
export async function getCategories(): Promise<Category[]> {
  return await apiClient<Category[]>('/api/search/categories', {
    next: { revalidate: 60 } as NextFetchRequestConfig,
  });
}

/**
 * Server-side: Fetch danh sách tags.
 * Dùng Next.js revalidate để cache 60 giây.
 */
export async function getTags(): Promise<Tag[]> {
  return await apiClient<Tag[]>('/api/search/tags', {
    next: { revalidate: 60 } as NextFetchRequestConfig,
  });
}

/**
 * Fetch menu items với search/filter params.
 * Không cache (cache: 'no-store') để luôn có dữ liệu mới nhất.
 */
export async function getMenuItems(
  searchParams?: MenuSearchParams,
): Promise<MenuSection[]> {
  return await apiClient<MenuSection[]>('/api/search/menu', {
    params: {
      q: searchParams?.q,
      category: searchParams?.category,
      tag: searchParams?.tag,
      lat: searchParams?.lat !== undefined ? String(searchParams.lat) : undefined,
      lon: searchParams?.lon !== undefined ? String(searchParams.lon) : undefined,
      radius: searchParams?.radius,
      sort_by: searchParams?.sort_by,
      open_only: searchParams?.open_only ? 'true' : undefined,
    },
    cache: 'no-store',
  });
}

/**
 * Client-side: Gợi ý tìm kiếm tức thời (Autocomplete Suggestions).
 * Hỗ trợ AbortSignal để hủy request khi người dùng gõ phím liên tục (chống race condition).
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
