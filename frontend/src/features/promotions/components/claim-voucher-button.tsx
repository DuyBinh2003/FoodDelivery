'use client';

import React, { useState } from 'react';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { promotionApiClient } from '@/features/promotions/services/promotion-api.client';

export interface ClaimVoucherButtonProps {
  voucherId: string;
  hasClaimed?: boolean;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export const ClaimVoucherButton: React.FC<ClaimVoucherButtonProps> = ({
  voucherId,
  hasClaimed = false,
  onSuccess,
  onError,
}) => {
  const [claimed, setClaimed] = useState(hasClaimed);
  const [loading, setLoading] = useState(false);

  const handleClaim = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (claimed || loading) return;

    setLoading(true);
    try {
      // Get or create lightweight device fingerprint from browser
      const fp = typeof window !== 'undefined'
        ? `fp_${navigator.userAgent.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}`
        : 'unknown_fp';

      await promotionApiClient.claimVoucher(voucherId, fp);
      setClaimed(true);
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu mã vào ví';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  if (claimed) {
    return (
      <button
        disabled
        className="w-full py-2 px-3 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-default transition-all"
      >
        <Check className="w-3.5 h-3.5" />
        Đã lưu vào Ví
      </button>
    );
  }

  return (
    <button
      onClick={handleClaim}
      disabled={loading}
      className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary-hover active:scale-95 text-primary-foreground font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20"
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Đang lưu...
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5" />
          Lưu mã ngay
        </>
      )}
    </button>
  );
};
