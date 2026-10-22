import { apiClient } from '@/lib/api-client';
import type {
  WalletDetailsResponse,
  TopupWalletDto,
  ProcessPaymentDto,
  OrderPaymentDetails,
} from '../types';

export const getCustomerWallet = async (ownerId: string): Promise<WalletDetailsResponse> => {
  return apiClient<WalletDetailsResponse>(`/wallets/owner/${ownerId}?ownerType=CUSTOMER`, {
    method: 'GET',
  });
};

export const topupWallet = async (dto: TopupWalletDto): Promise<unknown> => {
  return apiClient<unknown>('/wallets/topup', {
    method: 'POST',
    body: dto,
  });
};

export const processOrderPayment = async (dto: ProcessPaymentDto): Promise<{
  paymentIntent: unknown;
  transaction?: unknown;
}> => {
  return apiClient<{ paymentIntent: unknown; transaction?: unknown }>('/payment/process', {
    method: 'POST',
    body: dto,
  });
};

export const getOrderPaymentDetails = async (
  orderId: string,
  options?: { headers?: Record<string, string> },
): Promise<OrderPaymentDetails | null> => {
  try {
    return await apiClient<OrderPaymentDetails>(`/payment/order/${orderId}`, {
      method: 'GET',
      headers: options?.headers,
    });
  } catch {
    return null;
  }
};

export const createGatewayPaymentUrl = async (
  dto: import('../types').CreateGatewayPaymentUrlDto,
): Promise<import('../types').PaymentUrlResponse> => {
  return apiClient<import('../types').PaymentUrlResponse>('/payment/gateway/create-url', {
    method: 'POST',
    body: dto,
  });
};

export const simulateGatewayWebhook = async (
  dto: import('../types').SimulateGatewayWebhookDto,
): Promise<import('../types').SimulateGatewayWebhookResponse> => {
  return apiClient<import('../types').SimulateGatewayWebhookResponse>('/payment/webhooks/simulate', {
    method: 'POST',
    body: dto,
  });
};
