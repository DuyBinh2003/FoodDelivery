import { apiClient } from '@/lib/api-client';
import type {
  PartnerRestaurantData,
  PartnerRestaurant,
  PartnerMenuItem,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
  UpdateRestaurantProfilePayload,
  CategoryItem,
  TagItem,
} from '@/features/restaurant/types/partner.types';

export async function getMyRestaurant(): Promise<PartnerRestaurantData> {
  return await apiClient<PartnerRestaurantData>('/restaurants/partner/my-restaurant', {
    cache: 'no-store',
  });
}

export async function updateRestaurantStatus(isActive: boolean): Promise<PartnerRestaurant> {
  return await apiClient<PartnerRestaurant>('/restaurants/partner/my-restaurant/status', {
    method: 'PATCH',
    body: { is_active: isActive },
  });
}

export async function updateRestaurantProfile(
  payload: UpdateRestaurantProfilePayload,
): Promise<PartnerRestaurant> {
  return await apiClient<PartnerRestaurant>('/restaurants/partner/my-restaurant/profile', {
    method: 'PATCH',
    body: payload,
  });
}

export async function createPartnerMenuItem(
  payload: CreateMenuItemPayload,
): Promise<PartnerMenuItem> {
  return await apiClient<PartnerMenuItem>('/restaurants/partner/my-restaurant/menu-items', {
    method: 'POST',
    body: payload,
  });
}

export async function updatePartnerMenuItem(
  itemId: string,
  payload: UpdateMenuItemPayload,
): Promise<PartnerMenuItem> {
  return await apiClient<PartnerMenuItem>(`/restaurants/partner/my-restaurant/menu-items/${itemId}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deletePartnerMenuItem(itemId: string): Promise<void> {
  return await apiClient<void>(`/restaurants/partner/my-restaurant/menu-items/${itemId}`, {
    method: 'DELETE',
  });
}

export async function getAvailableCategories(): Promise<CategoryItem[]> {
  return await apiClient<CategoryItem[]>('/restaurants/categories', {
    next: { revalidate: 60 } as NextFetchRequestConfig,
  });
}

export async function getAvailableTags(): Promise<TagItem[]> {
  return await apiClient<TagItem[]>('/restaurants/tags', {
    next: { revalidate: 60 } as NextFetchRequestConfig,
  });
}
