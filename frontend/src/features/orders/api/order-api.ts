import { apiClient } from '@/lib/api-client';
import { Order, CreateOrderReviewDto } from '@/features/orders/types';

export const getOrderHistory = async (): Promise<Order[]> => {
  // Temporary: In a real app we'd pass JWT token from cookie, but for dev we use /history/me
  const response = await apiClient<Order[]>('/orders/history/me', { method: 'GET' });
  return response;
};

export const createOrderReview = async (orderId: string, data: CreateOrderReviewDto) => {
  const response = await apiClient<unknown>(`/orders/${orderId}/reviews`, { method: 'POST', body: data });
  return response;
};
