import { apiClient } from '@/lib/api-client';
import type { Order, CreateOrderReviewDto } from '@/features/orders/types';

export interface CreateOrderPayload {
  restaurant_id: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  recipient_name?: string;
  recipient_phone?: string;
  note?: string;
  payment_method?: 'CASH' | 'MOMO' | 'VNPAY';
  points_to_use?: number;
  items: Array<{
    menu_item_id: string;
    name?: string;
    quantity: number;
    unit_price: number;
    options?: string[];
    notes?: string;
  }>;
}

export const createOrder = async (payload: CreateOrderPayload): Promise<Order> => {
  return apiClient<Order>('/orders', {
    method: 'POST',
    body: payload,
  });
};

export const getOrderById = async (
  orderId: string,
  options?: { headers?: Record<string, string> },
): Promise<Order> => {
  return apiClient<Order>(`/orders/${orderId}`, {
    method: 'GET',
    headers: options?.headers,
  });
};

export const getOrderHistory = async (): Promise<Order[]> => {
  // Temporary: In a real app we'd pass JWT token from cookie, but for dev we use /history/me
  const response = await apiClient<Order[]>('/orders/history/me', { method: 'GET' });
  return response;
};

export const createOrderReview = async (orderId: string, data: CreateOrderReviewDto) => {
  const response = await apiClient<unknown>(`/orders/${orderId}/reviews`, { method: 'POST', body: data });
  return response;
};

export const cancelOrder = async (orderId: string): Promise<Order> => {
  return apiClient<Order>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status: 'CANCELLED' },
  });
};

