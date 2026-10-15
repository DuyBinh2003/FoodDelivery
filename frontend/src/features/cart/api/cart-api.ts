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
  isValid: boolean;
  totalAmount: number;
  validatedItems?: Array<{
    item_id: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  invalidItems?: Array<{
    item_id?: string;
    reason: string;
    name?: string;
    price?: number;
  }>;
  reason?: string;
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
