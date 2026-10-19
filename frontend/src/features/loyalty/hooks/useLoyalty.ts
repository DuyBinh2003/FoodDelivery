import { useState, useEffect, useCallback } from 'react';
import { getMyLoyaltyProfile } from '@/features/loyalty/api/loyalty-api';
import type { LoyaltyProfileResponse } from '@/features/loyalty/types/loyalty.types';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function useLoyalty() {
  const { isAuthenticated } = useAuthStore();
  const [profile, setProfile] = useState<LoyaltyProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLoyalty = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const data = await getMyLoyaltyProfile();
      setProfile(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải thông tin điểm thưởng';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLoyalty();
  }, [fetchLoyalty]);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchLoyalty,
  };
}
