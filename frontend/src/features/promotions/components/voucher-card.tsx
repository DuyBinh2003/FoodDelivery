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
  let badgeLabel = 'Giảm giá Sàn';
  let badgeIcon = <Sparkles className="w-3.5 h-3.5" />;
  let accentBar = 'bg-primary';
  let tagColor = 'bg-primary/12 text-primary border-primary/25';

  if (category === 'FREE_SHIPPING') {
    badgeLabel = 'Freeship';
    badgeIcon = <Truck className="w-3.5 h-3.5" />;
    accentBar = 'bg-emerald-500';
    tagColor = 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
  } else if (category === 'MERCHANT_DISCOUNT') {
    badgeLabel = 'Ưu đãi Quán';
    badgeIcon = <Store className="w-3.5 h-3.5" />;
    accentBar = 'bg-amber-500';
    tagColor = 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/25';
  } else if (category === 'PAYMENT_DISCOUNT') {
    badgeLabel = 'Ví điện tử';
    badgeIcon = <CreditCard className="w-3.5 h-3.5" />;
    accentBar = 'bg-sky-500';
    tagColor = 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/25';
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
      className={`relative rounded-2xl border bg-card text-card-foreground pl-5 pr-4 py-4 transition-all duration-200 overflow-hidden shadow-xs ${
        disabled
          ? 'opacity-55 grayscale border-border cursor-not-allowed'
          : `cursor-pointer border-border hover:border-primary/45 hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : ''
            }`
      }`}
    >
      {/* Ticket-style left accent stripe + punched notches */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${accentBar}`} />
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-background border border-border" />

      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tagColor}`}>
          {badgeIcon}
          {badgeLabel}
        </span>
        <span className="font-mono text-xs font-bold tracking-wider px-2.5 py-0.5 rounded-lg bg-secondary text-foreground border border-border">
          {code}
        </span>
      </div>

      {/* Main Info */}
      <div className="space-y-1">
        <h4 className="font-heading font-extrabold text-base text-foreground flex items-center gap-2">
          {formattedDiscount}
          {maxDiscountAmount ? (
            <span className="text-xs font-medium text-muted-foreground">
              (tối đa {maxDiscountAmount.toLocaleString('vi-VN')}đ)
            </span>
          ) : null}
        </h4>
        <p className="text-xs text-foreground/85 font-semibold line-clamp-1">{name}</p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
        )}
      </div>

      {/* Constraints & Expiry */}
      <div className="mt-3 pt-2.5 border-t border-dashed border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-primary" />
          <span>Đơn từ {minOrderAmount.toLocaleString('vi-VN')}đ</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>HSD: {dateStr}</span>
        </div>
      </div>

      {/* Scarcity Progress Bar */}
      {claimedPercentage !== undefined && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className={isAlmostFull ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}>
              {isAlmostFull ? 'Sắp hết mã!' : `Đã lưu ${claimedPercentage}%`}
            </span>
            <span className="text-muted-foreground font-mono">{claimedPercentage}%</span>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isAlmostFull ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${claimedPercentage}%` }}
            />
          </div>
        </div>
      )}

      {disabled && disabledReason && (
        <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 text-[11px] text-destructive font-medium">
          {disabledReason}
        </div>
      )}

      {actionButton && <div className="mt-3">{actionButton}</div>}
    </div>
  );
};
