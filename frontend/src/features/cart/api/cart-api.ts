import { apiClient } from '@/lib/api-client';

export interface ValidateCartItem {
  item_id: string;
  quantity: number;
  options?: string[];
}

export interface ValidateCartPayload {
  restaurant_id: string;
  items: ValidateCartItem[];
}

export interface ValidateCartResponse {
  items: Array<{
    is_available: boolean;
    error?: string;
    item_id: string;
    quantity: number;
    price?: number;
    options?: string[];
  }>;
}

/**
 * Client-side: Validate the current cart items against the backend.
 */
export async function validateCartApi(payload: ValidateCartPayload): Promise<ValidateCartResponse> {
  return await apiClient<ValidateCartResponse>('/orders/validate-cart', {
    method: 'POST',
    body: payload,
  });
}
