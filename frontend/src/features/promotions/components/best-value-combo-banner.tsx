'use client';

import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import type { BestComboResult } from '@/features/promotions/services/promotion-api.client';

export interface BestValueComboBannerProps {
  comboResult: BestComboResult | null;
  loading?: boolean;
  onApplyCombo: () => void;
  isApplied?: boolean;
}

export const BestValueComboBanner: React.FC<BestValueComboBannerProps> = ({
  comboResult,
  loading = false,
  onApplyCombo,
  isApplied = false,
}) => {
  if (loading) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 animate-pulse">
        <div className="h-4 bg-amber-500/20 rounded w-1/2 mb-2" />
        <div className="h-3 bg-amber-500/10 rounded w-3/4" />
      </div>
    );
  }

  if (!comboResult || comboResult.total_discount_amount <= 0) {
    return null;
  }

  const { total_discount_amount, selected_vouchers } = comboResult;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-4 shadow-lg shadow-amber-500/5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
            <Zap className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Combo Giảm Sâu Nhất Toàn Sàn</span>
          </div>
          <p className="text-xs text-neutral-300">
            Tiết kiệm <span className="text-amber-300 font-bold text-sm">{total_discount_amount.toLocaleString('vi-VN')}đ</span> với {selected_vouchers.length} ưu đãi tối ưu nhất:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selected_vouchers.map((v) => (
              <span key={v.id} className="text-[11px] px-2 py-0.5 rounded bg-neutral-900/80 border border-neutral-700 text-neutral-300 font-mono">
                {v.code} (-{v.discount_amount.toLocaleString('vi-VN')}đ)
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={onApplyCombo}
          className={`shrink-0 px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            isApplied
              ? 'bg-emerald-600/30 border border-emerald-500/50 text-emerald-300'
              : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md shadow-amber-500/20 active:scale-95'
          }`}
        >
          {isApplied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã Áp Dụng
            </>
          ) : (
            'Áp Dụng Combo'
          )}
        </button>
      </div>
    </div>
  );
};
