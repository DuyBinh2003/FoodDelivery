import { apiClient } from '@/lib/api-client';

export interface WalletVoucher {
  id: string;
  voucher_id: string;
  code: string;
  name: string;
  description: string | null;
  voucher_type: string;
  voucher_category: 'PLATFORM_DISCOUNT' | 'MERCHANT_DISCOUNT' | 'FREE_SHIPPING' | 'PAYMENT_DISCOUNT';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  status: 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED';
  claimed_at: string;
  expires_at: string;
  sponsor_type: string;
  restaurant_id: string | null;
}

export interface VoucherFeedItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  voucher_type: string;
  voucher_category: 'PLATFORM_DISCOUNT' | 'MERCHANT_DISCOUNT' | 'FREE_SHIPPING' | 'PAYMENT_DISCOUNT';
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  total_quantity: number;
  claimed_quantity: number;
  claimed_percentage: number;
  is_almost_full: boolean;
  valid_from: string;
  valid_to: string;
  sponsor_type: string;
  restaurant_id: string | null;
  has_claimed?: boolean;
}

export interface BestComboResult {
  selected_vouchers: Array<{
    id: string;
    code: string;
    name: string;
    category: 'PLATFORM_DISCOUNT' | 'MERCHANT_DISCOUNT' | 'FREE_SHIPPING' | 'PAYMENT_DISCOUNT';
    discount_amount: number;
    sponsor_type: string;
  }>;
  total_discount_amount: number;
  food_discount_amount: number;
  shipping_discount_amount: number;
  final_subtotal: number;
  final_delivery_fee: number;
  final_total_amount: number;
  ineligible_vouchers: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    rejection_reason: string;
  }>;
}

export interface CampaignBurnRate {
  campaign_id: string;
  campaign_code: string;
  campaign_name: string;
  total_budget_amount: number;
  current_spent_amount: number;
  remaining_budget_amount: number;
  burn_rate_percentage: number;
  burn_rate_per_minute: number;
  estimated_minutes_remaining: number | null;
  is_emergency_killed: boolean;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED';
}

export const promotionApiClient = {
  async getWallet(status?: string): Promise<WalletVoucher[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return apiClient<WalletVoucher[]>(`/vouchers/wallet${query}`, { method: 'GET' });
  },

  async getFeed(): Promise<VoucherFeedItem[]> {
    return apiClient<VoucherFeedItem[]>('/vouchers/feed', { method: 'GET' });
  },

  async claimVoucher(voucherId: string, deviceFingerprint = 'web_client_fp'): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(
      `/vouchers/${voucherId}/claim`,
      {
        method: 'POST',
        headers: {
          'x-device-fingerprint': deviceFingerprint,
          'Idempotency-Key': `claim_${voucherId}_${Date.now()}`,
        },
      },
    );
  },

  async recommendBestCombo(payload: {
    customer_id?: string;
    restaurant_id: string;
    subtotal: number;
    delivery_fee?: number;
    payment_method?: string;
    voucher_codes?: string[];
  }): Promise<BestComboResult> {
    return apiClient<BestComboResult>('/vouchers/recommend-best-combo', {
      method: 'POST',
      body: payload,
    });
  },

  async validateCode(
    code: string,
    restaurantId?: string,
    subtotal = 0,
    deliveryFee = 0,
  ): Promise<{ is_valid: boolean; message?: string }> {
    return apiClient<{ is_valid: boolean; message?: string }>('/vouchers/validate', {
      method: 'POST',
      body: {
        code,
        restaurant_id: restaurantId,
        subtotal,
        delivery_fee: deliveryFee,
      },
    });
  },

  async getCampaigns() {
    return apiClient('/vouchers/campaigns', { method: 'GET' });
  },

  async getBurnRate(campaignId: string): Promise<CampaignBurnRate> {
    return apiClient<CampaignBurnRate>(`/vouchers/campaigns/${campaignId}/burn-rate`, { method: 'GET' });
  },

  async emergencyKill(campaignId: string) {
    return apiClient(`/vouchers/campaigns/${campaignId}/emergency-kill`, { method: 'POST' });
  },

  async joinCoFunded(campaignId: string, restaurantId: string, merchantBudgetCap: number) {
    return apiClient(`/vouchers/campaigns/${campaignId}/join`, {
      method: 'POST',
      body: {
        restaurant_id: restaurantId,
        merchant_budget_cap: merchantBudgetCap,
      },
    });
  },
};
