"use client";

import React, { useState } from 'react';
import { Coins, Sparkles, AlertCircle } from 'lucide-react';
import { useLoyalty } from '@/features/loyalty/hooks/useLoyalty';
import { LoyaltyTierBadge } from '@/features/loyalty/components/LoyaltyTierBadge';

interface LoyaltyCheckoutSectionProps {
  subtotal: number;
  onPointsChange: (pointsToUse: number, discountVND: number) => void;
}

export const LoyaltyCheckoutSection: React.FC<LoyaltyCheckoutSectionProps> = ({
  subtotal,
  onPointsChange,
}) => {
  const { profile, isLoading } = useLoyalty();
  const [isEnabled, setIsEnabled] = useState(false);
  const [pointsInput, setPointsInput] = useState<number>(0);

  const availablePoints = profile?.wallet?.available_points || 0;
  const currentTier = profile?.wallet?.tier || 'BRONZE';

  // Trần giảm giá: Tối đa 50% tiền món (Subtotal)
  const maxDiscountVND = Math.floor(subtotal * 0.5);
  // Số điểm tối đa được phép dùng (1 điểm = 10 VND)
  const maxAllowedPoints = Math.min(
    availablePoints,
    Math.floor(maxDiscountVND / 10),
  );

  const isEligible = availablePoints >= 100 && maxAllowedPoints >= 100;

  // Xử lý khi bật/tắt hoặc thay đổi số điểm
  const handleToggle = (enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled) {
      setPointsInput(0);
      onPointsChange(0, 0);
    } else {
      // Mặc định khi bật: Điền số điểm tối đa cho phép
      const defaultPoints = maxAllowedPoints;
      setPointsInput(defaultPoints);
      onPointsChange(defaultPoints, defaultPoints * 10);
    }
  };

  const handlePointsChange = (val: number) => {
    const cleanVal = Math.max(0, Math.min(val, maxAllowedPoints));
    setPointsInput(cleanVal);

    if (cleanVal >= 100) {
      onPointsChange(cleanVal, cleanVal * 10);
    } else {
      onPointsChange(0, 0);
    }
  };

  const handleUseMax = () => {
    setPointsInput(maxAllowedPoints);
    onPointsChange(maxAllowedPoints, maxAllowedPoints * 10);
  };

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-card border border-border animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-2"></div>
        <div className="h-4 w-60 bg-muted/60 rounded"></div>
      </div>
    );
  }

  if (!profile) {
    return null; // Khách chưa đăng nhập
  }

  const discountAmount = isEnabled && pointsInput >= 100 ? pointsInput * 10 : 0;

  return (
    <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">Điểm thưởng tích lũy</span>
              <LoyaltyTierBadge tier={currentTier} size="sm" showMultiplier={false} />
            </div>
            <p className="text-xs text-muted-foreground">
              Khả dụng:{' '}
              <strong className="text-amber-600 dark:text-amber-400 font-bold">
                {availablePoints.toLocaleString('vi-VN')}
              </strong>{' '}
              điểm (Quy đổi 1 điểm = 10 đ)
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        {isEligible ? (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        ) : (
          <span className="text-xs text-muted-foreground font-medium">Chưa đủ 100 điểm</span>
        )}
      </div>

      {/* When Toggle is Active */}
      {isEnabled && isEligible && (
        <div className="pt-3 border-t border-border/60 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="number"
                min={100}
                max={maxAllowedPoints}
                step={50}
                value={pointsInput || ''}
                onChange={(e) => handlePointsChange(Number(e.target.value))}
                placeholder="Số điểm muốn dùng"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-foreground font-medium text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
              />
              <span className="absolute right-3 top-2 text-xs text-muted-foreground font-medium pointer-events-none">
                điểm
              </span>
            </div>

            <button
              type="button"
              onClick={handleUseMax}
              className="px-3.5 py-2 bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold rounded-xl border border-primary/30 transition-colors shrink-0 cursor-pointer"
            >
              Tối đa ({maxAllowedPoints.toLocaleString('vi-VN')})
            </button>
          </div>

          {/* Range Slider for interactive UX */}
          {maxAllowedPoints >= 100 && (
            <input
              type="range"
              min={100}
              max={maxAllowedPoints}
              step={50}
              value={pointsInput}
              onChange={(e) => handlePointsChange(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          )}

          {/* Summary / Discount Tag */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Giảm trực tiếp vào đơn:
            </span>
            <span className="font-bold text-primary text-sm font-mono tabular-nums">
              -{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}
            </span>
          </div>

          {/* Validation note */}
          <p className="text-[11px] text-muted-foreground">
            * Quy định: Tối thiểu 100 điểm, trần tối đa 50% tiền món ({new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(maxDiscountVND)}).
          </p>
        </div>
      )}

      {!isEligible && availablePoints < 100 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Bạn cần tích lũy tối thiểu 100 điểm để quy đổi voucher hoặc giảm giá.
        </p>
      )}
    </div>
  );
};
