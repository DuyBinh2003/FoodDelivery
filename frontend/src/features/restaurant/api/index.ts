import { apiClient } from '@/lib/api-client';
import type { Restaurant, MenuItem } from '@/features/menu/types';

export async function getRestaurant(id: string): Promise<Restaurant> {
  return await apiClient<Restaurant>(`/restaurants/${id}`, {
    next: { revalidate: 60 } as NextFetchRequestConfig,
  });
}

export async function getRestaurantMenu(id: string): Promise<MenuItem[]> {
  return await apiClient<MenuItem[]>(`/restaurants/${id}/menu-items`, {
    next: { revalidate: 60 } as NextFetchRequestConfig,
  });
}

export async function submitRestaurantRegistration(payload: Record<string, unknown>): Promise<void> {
  console.log("registering restaurant:", payload);
  return await apiClient<void>('/users/registrations', {
    method: 'POST',
    body: {
      type: 'RESTAURANT',
      payload,
    },
  });
}
