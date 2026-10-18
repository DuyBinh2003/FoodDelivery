import { apiClient } from '@/lib/api-client';
import {
  AdminAnalyticsResponse,
  PlatformTreasurySummary,
  AdminOrder,
  AdminUser,
  AdminDriver,
  AdminRestaurant,
  AdminPaginatedResponse,
} from '@/features/admin/types';

export const adminApi = {
  getAnalytics(range: '7d' | '30d' | 'all' = '7d'): Promise<AdminAnalyticsResponse> {
    return apiClient<AdminAnalyticsResponse>(`/admin/analytics/dashboard?range=${range}`);
  },

  getWalletSummary(page = 1, limit = 20): Promise<PlatformTreasurySummary> {
    return apiClient<PlatformTreasurySummary>(`/admin/wallet/summary?page=${page}&limit=${limit}`);
  },

  getOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<AdminPaginatedResponse<AdminOrder>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return apiClient<AdminPaginatedResponse<AdminOrder>>(`/admin/orders?${query.toString()}`);
  },

  getUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  } = {}): Promise<AdminPaginatedResponse<AdminUser>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.role && params.role !== 'ALL') query.set('role', params.role);
    if (params.search) query.set('search', params.search);
    return apiClient<AdminPaginatedResponse<AdminUser>>(`/admin/users?${query.toString()}`);
  },

  getDrivers(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<AdminPaginatedResponse<AdminDriver>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return apiClient<AdminPaginatedResponse<AdminDriver>>(`/admin/drivers?${query.toString()}`);
  },

  getRestaurants(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<AdminPaginatedResponse<AdminRestaurant>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return apiClient<AdminPaginatedResponse<AdminRestaurant>>(`/admin/restaurants?${query.toString()}`);
  },
};
