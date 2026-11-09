'use client';

import React from 'react';
import { Tag, Sparkles, Truck, Store, CreditCard, Clock } from 'lucide-react';

export interface VoucherCardProps {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category: 'PLATFORM_DISCOUNT' | 'MERCHANT_DISCOUNT' | 'FREE_SHIPPING' | 'PAYMENT_DISCOUNT' | string;
  discountValue: number;
  discountType?: string;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  expiresAt: string;
  claimedPercentage?: number;
  isAlmostFull?: boolean;
  status?: string;
  actionButton?: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const VoucherCard: React.FC<VoucherCardProps> = ({
  code,
  name,
  description,
  category,
  discountValue,
  discountType = 'PERCENTAGE',
  maxDiscountAmount,
  minOrderAmount,
  expiresAt,
  claimedPercentage,
  isAlmostFull,
  disabled = false,
  disabledReason,
  actionButton,
  isSelected = false,
  onSelect,
}) => {
  // Theme color styles by voucher category
  let badgeLabel = 'Giảm giá Sàn';
  let badgeIcon = <Sparkles className="w-3.5 h-3.5" />;
  let borderStyle = 'border-amber-500/30 hover:border-amber-500/60';
  let gradientBg = 'from-amber-500/10 via-amber-500/5 to-transparent';
  let tagColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';

  if (category === 'FREE_SHIPPING') {
    badgeLabel = 'Freeship';
    badgeIcon = <Truck className="w-3.5 h-3.5" />;
    borderStyle = 'border-emerald-500/30 hover:border-emerald-500/60';
    gradientBg = 'from-emerald-500/10 via-emerald-500/5 to-transparent';
    tagColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  } else if (category === 'MERCHANT_DISCOUNT') {
    badgeLabel = 'Ưu đãi Quán';
    badgeIcon = <Store className="w-3.5 h-3.5" />;
    borderStyle = 'border-purple-500/30 hover:border-purple-500/60';
    gradientBg = 'from-purple-500/10 via-purple-500/5 to-transparent';
    tagColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
  } else if (category === 'PAYMENT_DISCOUNT') {
    badgeLabel = 'Ví điện tử';
    badgeIcon = <CreditCard className="w-3.5 h-3.5" />;
    borderStyle = 'border-cyan-500/30 hover:border-cyan-500/60';
    gradientBg = 'from-cyan-500/10 via-cyan-500/5 to-transparent';
    tagColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  }

  const formattedDiscount =
    discountType === 'PERCENTAGE'
      ? `Giảm ${discountValue}%`
      : `Giảm ${discountValue.toLocaleString('vi-VN')}đ`;

  const dateStr = new Date(expiresAt).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div
      onClick={!disabled && onSelect ? onSelect : undefined}
      className={`relative rounded-xl border p-4 transition-all duration-200 overflow-hidden ${
        disabled
          ? 'opacity-50 grayscale border-neutral-800 bg-neutral-900/40 cursor-not-allowed'
          : `cursor-pointer ${borderStyle} bg-gradient-to-br ${gradientBg} ${
              isSelected ? 'ring-2 ring-primary border-primary shadow-lg shadow-primary/10' : ''
            }`
      }`}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tagColor}`}>
          {badgeIcon}
          {badgeLabel}
        </span>
        <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
          {code}
        </span>
      </div>

      {/* Main Info */}
      <div className="space-y-1">
        <h4 className="font-bold text-base text-neutral-100 flex items-center gap-2">
          {formattedDiscount}
          {maxDiscountAmount ? (
            <span className="text-xs font-normal text-neutral-400">
              (tối đa {maxDiscountAmount.toLocaleString('vi-VN')}đ)
            </span>
          ) : null}
        </h4>
        <p className="text-xs text-neutral-300 font-medium line-clamp-1">{name}</p>
        {description && (
          <p className="text-xs text-neutral-400 line-clamp-1">{description}</p>
        )}
      </div>

      {/* Constraints & Expiry */}
      <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-neutral-500" />
          <span>Đơn từ {minOrderAmount.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <Clock className="w-3.5 h-3.5 text-neutral-500" />
          <span>HSD: {dateStr}</span>
        </div>
      </div>

      {/* Scarcity Progress Bar if feed item */}
      {claimedPercentage !== undefined && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className={isAlmostFull ? 'text-amber-400 font-semibold' : 'text-neutral-400'}>
              {isAlmostFull ? '🔥 Sắp hết mã!' : `Đã lưu ${claimedPercentage}%`}
            </span>
            <span className="text-neutral-500">{claimedPercentage}%</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAlmostFull ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${claimedPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Rejection / Disabled Reason */}
      {disabled && disabledReason && (
        <div className="mt-2.5 px-2.5 py-1 rounded bg-red-950/40 border border-red-500/20 text-[11px] text-red-300">
          ⚠️ {disabledReason}
        </div>
      )}

      {/* Custom Action Slot */}
      {actionButton && <div className="mt-3">{actionButton}</div>}
    </div>
  );
};
