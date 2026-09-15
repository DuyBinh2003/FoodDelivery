import { apiClient } from '@/lib/api-client';
import type {
  Category,
  Tag,
  MenuSection,
  MenuSearchParams,
} from '@/features/search/types';

/**
 * Server-side: Fetch danh sách categories.
 * Dùng Next.js revalidate để cache 60 giây.
 */
export async function getCategories(): Promise<Category[]> {
  try {
    return await apiClient<Category[]>('/api/search/categories', {
      next: { revalidate: 60 } as NextFetchRequestConfig,
    });
  } catch {
    return [];
  }
}

/**
 * Server-side: Fetch danh sách tags.
 * Dùng Next.js revalidate để cache 60 giây.
 */
export async function getTags(): Promise<Tag[]> {
  try {
    return await apiClient<Tag[]>('/api/search/tags', {
      next: { revalidate: 60 } as NextFetchRequestConfig,
    });
  } catch {
    return [];
  }
}

/**
 * Server-side: Fetch menu items với search/filter params.
 * Không cache (cache: 'no-store') để luôn có dữ liệu mới nhất.
 */
export async function getMenuItems(
  searchParams?: MenuSearchParams,
): Promise<MenuSection[]> {
  try {
    return await apiClient<MenuSection[]>('/api/search/menu', {
      params: {
        q: searchParams?.q,
        category: searchParams?.category,
        tag: searchParams?.tag,
      },
      cache: 'no-store',
    });
  } catch {
    return [];
  }
}
