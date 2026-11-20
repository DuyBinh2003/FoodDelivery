/**
 * @file price-lock.utils.ts
 * @description Utilities for Checkout Price Lock countdown timer, price diff comparison and surge badges.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

export interface PriceBreakdownInput {
  itemsSubtotal: number;
  totalShippingFee: number;
  discountAmount?: number;
  totalAmount: number;
  surgeFee?: number;
  weatherFee?: number;
  nightFee?: number;
}

export interface PriceDiffResult {
  shippingFeeDiff: number;
  totalAmountDiff: number;
  isPriceIncreased: boolean;
  isPriceDecreased: boolean;
  isUnchanged: boolean;
  formattedDiffMessage: string;
}

export interface TimerWarningState {
  isExpiringSoon: boolean;
  isExpired: boolean;
  colorClass: string;
  dotColorClass: string;
}

/**
 * Formats remaining seconds into MM:SS format (e.g., 299s -> "04:59").
 */
export function formatCountdownTimer(remainingSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(remainingSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}`;
}

/**
 * Returns visual warning state when countdown timer is below 60s or expired.
 */
export function getTimerWarningState(remainingSeconds: number): TimerWarningState {
  if (remainingSeconds <= 0) {
    return {
      isExpiringSoon: false,
      isExpired: true,
      colorClass: 'text-rose-600 dark:text-rose-400 font-semibold',
      dotColorClass: 'bg-rose-500',
    };
  }

  if (remainingSeconds <= 60) {
    return {
      isExpiringSoon: true,
      isExpired: false,
      colorClass: 'text-rose-500 animate-pulse font-semibold',
      dotColorClass: 'bg-rose-500 animate-ping',
    };
  }

  return {
    isExpiringSoon: false,
    isExpired: false,
    colorClass: 'text-amber-600 dark:text-amber-400 font-medium',
    dotColorClass: 'bg-amber-500',
  };
}

/**
 * Calculates differences between expired price and newly calculated price quote.
 */
export function calculatePriceDiff(
  oldQuote: PriceBreakdownInput,
  newQuote: PriceBreakdownInput,
): PriceDiffResult {
  const shippingFeeDiff = newQuote.totalShippingFee - oldQuote.totalShippingFee;
  const totalAmountDiff = newQuote.totalAmount - oldQuote.totalAmount;

  const isPriceIncreased = totalAmountDiff > 0;
  const isPriceDecreased = totalAmountDiff < 0;
  const isUnchanged = totalAmountDiff === 0;

  let formattedDiffMessage = 'Giá giữ nguyên không đổi.';
  if (isPriceIncreased) {
    const absDiff = totalAmountDiff.toLocaleString('vi-VN');
    formattedDiffMessage = `Tổng tiền tăng thêm ${absDiff}đ do biến động phụ phí khu vực.`;
  } else if (isPriceDecreased) {
    const absDiff = Math.abs(totalAmountDiff).toLocaleString('vi-VN');
    formattedDiffMessage = `Bạn tiết kiệm thêm ${absDiff}đ do phụ phí vừa giảm.`;
  }

  return {
    shippingFeeDiff,
    totalAmountDiff,
    isPriceIncreased,
    isPriceDecreased,
    isUnchanged,
    formattedDiffMessage,
  };
}

/**
 * Extracts friendly Vietnamese badge labels explaining applied surge pricing factors.
 */
export function getSurgeReasonLabels(breakdown: PriceBreakdownInput): string[] {
  const badges: string[] = [];

  if (breakdown.surgeFee && breakdown.surgeFee > 0) {
    badges.push('⚡ Phụ phí giờ cao điểm');
  }

  if (breakdown.weatherFee && breakdown.weatherFee > 0) {
    badges.push('🌧️ Phụ phí thời tiết xấu');
  }

  if (breakdown.nightFee && breakdown.nightFee > 0) {
    badges.push('🌙 Phụ phí giao đêm');
  }

  return badges;
}

