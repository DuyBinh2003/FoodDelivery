import { apiClient } from '@/lib/api-client';
import type { Order, CreateOrderReviewDto } from '@/features/orders/types';

export interface CreateOrderPayload {
  customer_id: string;
  restaurant_id: string;
  delivery_address: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    unit_price: number;
  }>;
}

export const createOrder = async (payload: CreateOrderPayload): Promise<Order> => {
  return apiClient<Order>('/orders', {
    method: 'POST',
    body: payload,
  });
};

export const getOrderById = async (orderId: string): Promise<Order> => {
  return apiClient<Order>(`/orders/${orderId}`, {
    method: 'GET',
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

