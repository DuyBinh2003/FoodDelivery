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

export async function getOperatingHours(id: string): Promise<import('../types/operating-hours.types').OperatingHourItem[]> {
  return await apiClient(`/restaurants/${id}/operating-hours`, {
    cache: 'no-store',
  });
}

export async function getOperatingStatus(id: string): Promise<import('../types/operating-hours.types').RestaurantOperatingStatus> {
  return await apiClient(`/restaurants/${id}/operating-status`, {
    cache: 'no-store',
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

export * from './partner-api';

