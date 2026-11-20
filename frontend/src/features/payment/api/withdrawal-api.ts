import { apiClient } from '@/lib/api-client';
import type {
  WithdrawalRequest,
  CreateWithdrawalPayload,
  WithdrawalListResponse,
} from '@/features/payment/types/withdrawal.types';

export const withdrawalApi = {
  requestWithdrawal(payload: CreateWithdrawalPayload): Promise<WithdrawalRequest> {
    return apiClient<WithdrawalRequest>('/wallets/withdraw', {
      method: 'POST',
      body: payload,
    });
  },

  getWithdrawals(params: {
    requesterId?: string;
    walletAccountId?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<WithdrawalListResponse> {
    const query = new URLSearchParams();
    if (params.requesterId) query.set('requesterId', params.requesterId);
    if (params.walletAccountId) query.set('walletAccountId', params.walletAccountId);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return apiClient<WithdrawalListResponse>(`/wallets/withdrawals?${query.toString()}`);
  },

  getWithdrawalById(id: string): Promise<WithdrawalRequest> {
    return apiClient<WithdrawalRequest>(`/wallets/withdrawals/${id}`);
  },
};
