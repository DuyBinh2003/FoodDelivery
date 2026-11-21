import { apiClient } from '@/lib/api-client';
import type {
  OrderDispute,
  CreateDisputePayload,
  DisputeListResponse,
} from '@/features/orders/types/dispute.types';

export const disputeApi = {
  createDispute(payload: CreateDisputePayload): Promise<OrderDispute> {
    return apiClient<OrderDispute>('/disputes', {
      method: 'POST',
      body: payload,
    });
  },

  getMyDisputes(params: { page?: number; limit?: number } = {}): Promise<DisputeListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return apiClient<DisputeListResponse>(`/disputes/my-disputes?${query.toString()}`);
  },

  getDisputeById(id: string): Promise<OrderDispute> {
    return apiClient<OrderDispute>(`/disputes/${id}`);
  },
};
