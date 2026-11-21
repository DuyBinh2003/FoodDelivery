import { apiClient } from '@/lib/api-client';
import {
  AdminAnalyticsResponse,
  PlatformTreasurySummary,
  AdminOrder,
  AdminUser,
  AdminDriver,
  AdminRestaurant,
  AdminPaginatedResponse,
  SystemConfigItem,
  AdminPayoutItem,
} from '@/features/admin/types';
import type {
  OrderDispute,
  DisputeDetailsResponse,
  DisputeListResponse,
} from '@/features/orders/types/dispute.types';

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

  getConfigs(): Promise<SystemConfigItem[]> {
    return apiClient<SystemConfigItem[]>('/admin/configs');
  },

  getSystemConfigs(): Promise<SystemConfigItem[]> {
    return apiClient<SystemConfigItem[]>('/admin/configs');
  },

  updateBulkConfigs(configs: Array<{ key: string; value: string }>): Promise<SystemConfigItem[]> {
    return apiClient<SystemConfigItem[]>('/admin/configs/bulk', {
      method: 'PUT',
      body: { configs },
    });
  },

  updateSystemConfig(key: string, value: string): Promise<SystemConfigItem> {
    return apiClient<SystemConfigItem>(`/admin/configs/${key}`, {
      method: 'PUT',
      body: { value },
    });
  },

  getPayouts(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<AdminPaginatedResponse<AdminPayoutItem>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    return apiClient<AdminPaginatedResponse<AdminPayoutItem>>(`/admin/payouts?${query.toString()}`);
  },

  approvePayout(id: string, bankTransactionRef: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/admin/payouts/${id}/approve`, {
      method: 'PATCH',
      body: { bankTransactionRef },
    });
  },

  rejectPayout(id: string, rejectionReason: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/admin/payouts/${id}/reject`, {
      method: 'PATCH',
      body: { rejectionReason },
    });
  },

  getDisputes(params: {
    page?: number;
    limit?: number;
    status?: string;
    orderId?: string;
    customerId?: string;
  } = {}): Promise<DisputeListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.orderId) query.set('orderId', params.orderId);
    if (params.customerId) query.set('customerId', params.customerId);
    return apiClient<DisputeListResponse>(`/admin/disputes?${query.toString()}`);
  },

  getDisputeDetails(id: string): Promise<DisputeDetailsResponse> {
    return apiClient<DisputeDetailsResponse>(`/admin/disputes/${id}/details`);
  },

  resolveDispute(
    id: string,
    payload: {
      resolution_action: string;
      refund_amount?: number;
      penalty_party?: string;
      resolution_notes?: string;
    },
  ): Promise<OrderDispute> {
    return apiClient<OrderDispute>(`/admin/disputes/${id}/resolve`, {
      method: 'PATCH',
      body: payload,
    });
  },

  rejectDispute(id: string, notes: string): Promise<OrderDispute> {
    return apiClient<OrderDispute>(`/admin/disputes/${id}/reject`, {
      method: 'PATCH',
      body: { notes },
    });
  },
};
