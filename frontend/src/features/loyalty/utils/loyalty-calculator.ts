/**
 * @file loyalty-calculator.ts
 * @description Quy chuẩn tính toán điểm thưởng, quy đổi tiền tệ và tiến độ hạng thành viên
 * @traceability
 *   - Plan: docs/plans/customer/customer-loyalty-ui.md
 *   - Doc: docs/plans/platform/loyalty-points-rewards-engine.md
 */

import type { MembershipTier } from '../types/loyalty.types';

export const POINT_TO_VND_RATE = 10; // 1 điểm = 10 VND
export const MIN_POINTS_TO_REDEEM = 100; // Tối thiểu 100 điểm
export const MAX_DISCOUNT_PERCENT = 0.5; // Tối đa 50% tiền món (subtotal)

export const TIER_THRESHOLDS: Record<MembershipTier, number> = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  PLATINUM: 20000,
};

export const NEXT_TIER_TARGETS: Record<MembershipTier, number | null> = {
  BRONZE: 1000,
  SILVER: 5000,
  GOLD: 20000,
  PLATINUM: null,
};

/**
 * Tính số tiền giảm giá quy đổi từ điểm thưởng
 */
export function calculateDiscountFromPoints(points: number): number {
  if (points < MIN_POINTS_TO_REDEEM) return 0;
  return Math.floor(points * POINT_TO_VND_RATE);
}

/**
 * Tính số điểm tối đa được phép dùng cho một đơn hàng
 * @param availablePoints Số điểm khả dụng của khách hàng
 * @param subtotal Tiền món ăn trong giỏ hàng (chưa gồm phí ship)
 */
export function calculateMaxAllowedPoints(availablePoints: number, subtotal: number): number {
  if (subtotal <= 0 || availablePoints < MIN_POINTS_TO_REDEEM) return 0;

  const maxDiscountVND = Math.floor(subtotal * MAX_DISCOUNT_PERCENT);
  const maxPointsBySubtotal = Math.floor(maxDiscountVND / POINT_TO_VND_RATE);

  return Math.max(0, Math.min(availablePoints, maxPointsBySubtotal));
}

/**
 * Kiểm tra tính hợp lệ của số điểm người dùng muốn quy đổi
 */
export function validatePointsRedemption(
  points: number,
  availablePoints: number,
  subtotal: number,
): { isValid: boolean; error?: string } {
  if (points <= 0) {
    return { isValid: true };
  }

  if (points < MIN_POINTS_TO_REDEEM) {
    return {
      isValid: false,
      error: `Số điểm quy đổi tối thiểu là ${MIN_POINTS_TO_REDEEM} điểm`,
    };
  }

  if (points > availablePoints) {
    return {
      isValid: false,
      error: 'Số điểm quy đổi vượt quá số dư khả dụng',
    };
  }

  const maxDiscountVND = Math.floor(subtotal * MAX_DISCOUNT_PERCENT);
  const discountVND = points * POINT_TO_VND_RATE;

  if (discountVND > maxDiscountVND) {
    return {
      isValid: false,
      error: `Giảm giá từ điểm thưởng không được vượt quá 50% tiền món (${maxDiscountVND.toLocaleString('vi-VN')} đ)`,
    };
  }

  return { isValid: true };
}

/**
 * Tính toán tiến độ nâng hạng dựa trên tổng điểm trọn đời (lifetime points)
 */
export function calculateTierProgress(
  currentTier: MembershipTier,
  lifetimePoints: number,
): {
  targetPoints: number | null;
  progressPercent: number;
  pointsRemaining: number;
  isMaxTier: boolean;
} {
  const target = NEXT_TIER_TARGETS[currentTier];

  if (!target) {
    return {
      targetPoints: null,
      progressPercent: 100,
      pointsRemaining: 0,
      isMaxTier: true,
    };
  }

  const baseThreshold = TIER_THRESHOLDS[currentTier];
  const range = target - baseThreshold;
  const currentInRange = Math.max(0, lifetimePoints - baseThreshold);
  const percent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
  const remaining = Math.max(0, target - lifetimePoints);

  return {
    targetPoints: target,
    progressPercent: percent,
    pointsRemaining: remaining,
    isMaxTier: false,
  };
}
