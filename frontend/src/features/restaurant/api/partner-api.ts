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

export interface PartnerOrderItem {
  id?: string;
  menu_item_id: string;
  name?: string;
  quantity: number;
  unit_price: number;
}

export interface PartnerOrder {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  total_amount: number;
  status: string;
  delivery_address: string;
  note: string | null;
  cooking_at?: string | null;
  ready_at?: string | null;
  driver_claimed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at: string;
  items: PartnerOrderItem[];
}

export async function getRestaurantOrders(restaurantId: string): Promise<PartnerOrder[]> {
  return await apiClient<PartnerOrder[]>(`/orders/restaurant/${restaurantId}`, {
    cache: 'no-store',
  });
}

export async function updateOrderStatus(orderId: string, status: string): Promise<PartnerOrder> {
  return await apiClient<PartnerOrder>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}
