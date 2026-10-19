import { apiClient } from '@/lib/api-client';
import type { LoyaltyProfileResponse } from '@/features/loyalty/types/loyalty.types';

export const getMyLoyaltyProfile = async (): Promise<LoyaltyProfileResponse> => {
  return apiClient<LoyaltyProfileResponse>('/loyalty/my-points', {
    method: 'GET',
  });
};
