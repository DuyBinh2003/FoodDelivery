/**
 * @file voucher-calculator.ts
 * @description Helper functions for voucher discount breakdown, 4-tier mutual exclusion, and combo calculations.
 */

export interface AppliedVoucher {
  id: string;
  code: string;
  category: 'PLATFORM_DISCOUNT' | 'MERCHANT_DISCOUNT' | 'FREE_SHIPPING' | 'PAYMENT_DISCOUNT';
  discount_amount: number;
  min_order_amount?: number;
}

export interface CalculatedOrderDiscount {
  foodDiscount: number;
  shippingDiscount: number;
  effectiveFoodTotal: number;
  effectiveShipping: number;
  finalTotal: number;
}

/**
 * Calculates effective discounts and final amounts adhering to 4-tier stacking rules and non-negative boundaries.
 */
export function calculateVoucherDiscounts(
  subtotal: number,
  shippingFee: number,
  pointsDiscount: number,
  vouchers: AppliedVoucher[],
): CalculatedOrderDiscount {
  const safeSubtotal = Math.max(0, subtotal);
  const safeShippingFee = Math.max(0, shippingFee);
  const safePointsDiscount = Math.max(0, pointsDiscount);

  const shippingVoucherDiscount = vouchers
    .filter((v) => v.category === 'FREE_SHIPPING')
    .reduce((sum, v) => sum + Math.max(0, v.discount_amount), 0);

  const foodVoucherDiscount = vouchers
    .filter((v) => v.category !== 'FREE_SHIPPING')
    .reduce((sum, v) => sum + Math.max(0, v.discount_amount), 0);

  const effectiveFoodTotal = Math.max(0, safeSubtotal - safePointsDiscount - foodVoucherDiscount);
  const effectiveShipping = Math.max(0, safeShippingFee - shippingVoucherDiscount);
  const finalTotal = effectiveFoodTotal + effectiveShipping;

  return {
    foodDiscount: foodVoucherDiscount,
    shippingDiscount: Math.min(safeShippingFee, shippingVoucherDiscount),
    effectiveFoodTotal,
    effectiveShipping,
    finalTotal,
  };
}

/**
 * Validates 4-tier mutual exclusion (no two vouchers can share the same category).
 */
export function validateTierMutualExclusion(vouchers: AppliedVoucher[]): {
  isValid: boolean;
  duplicateCategory?: string;
} {
  const seenCategories = new Set<string>();
  for (const v of vouchers) {
    if (seenCategories.has(v.category)) {
      return { isValid: false, duplicateCategory: v.category };
    }
    seenCategories.add(v.category);
  }
  return { isValid: true };
}

/**
 * Verifies if a voucher meets the minimum basket subtotal requirement.
 */
export function isVoucherSubtotalEligible(voucher: AppliedVoucher, subtotal: number): boolean {
  if (!voucher.min_order_amount || voucher.min_order_amount <= 0) {
    return true;
  }
  return subtotal >= voucher.min_order_amount;
}
