/**
 * @file pricing-rules.ts
 * @description Pluggable Pricing Rules for Dynamic Surge Pricing Pipeline.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

export interface PricingItem {
  menu_item_id: string;
  name?: string;
  quantity: number;
  unit_price: number;
}

export type WeatherCondition = 'CLEAR' | 'RAIN' | 'STORM';

export interface PricingContext {
  items: PricingItem[];
  distanceKm?: number;
  activeOrdersInArea?: number;
  availableDriversInArea?: number;
  weatherCondition?: WeatherCondition;
  requestHour?: number;
  voucherDiscount?: number;
}

export interface PricingBreakdown {
  itemsSubtotal: number;
  baseShippingFee: number;
  surgeMultiplier: number;
  surgeFee: number;
  weatherFee: number;
  nightFee: number;
  discountAmount: number;
  totalShippingFee: number;
  totalAmount: number;
  appliedRules: string[];
}

export interface PricingRule {
  readonly name: string;
  evaluate(context: PricingContext, breakdown: PricingBreakdown): Promise<void> | void;
}

/**
 * Calculates standard distance-based shipping fee.
 * Base 15,000 VND for <= 2.0 km, plus 5,000 VND per additional km.
 */
export class DistancePricingRule implements PricingRule {
  readonly name = 'DistancePricingRule';

  evaluate(context: PricingContext, breakdown: PricingBreakdown): void {
    const distanceKm = Math.max(context.distanceKm ?? 2.0, 0);
    const baseKm = 2.0;
    const baseFee = 15000;
    const extraPerKm = 5000;

    let fee = baseFee;
    if (distanceKm > baseKm) {
      const extraKm = Math.ceil(distanceKm - baseKm);
      fee += extraKm * extraPerKm;
    }

    breakdown.baseShippingFee = fee;
    breakdown.appliedRules.push(this.name);
  }
}

/**
 * Calculates real-time Surge Multiplier based on demand/supply ratio in the delivery area.
 * Ratio = ActiveOrders / max(AvailableDrivers, 1)
 */
export class SurgeDemandPricingRule implements PricingRule {
  readonly name = 'SurgeDemandPricingRule';

  evaluate(context: PricingContext, breakdown: PricingBreakdown): void {
    const orders = Math.max(context.activeOrdersInArea ?? 0, 0);
    const drivers = Math.max(context.availableDriversInArea ?? 1, 1);
    const ratio = orders / drivers;

    let multiplier = 1.0;
    if (ratio > 3.0) {
      multiplier = 2.0; // Max surge cap
    } else if (ratio > 2.0) {
      multiplier = 1.5;
    } else if (ratio > 1.0) {
      multiplier = 1.2;
    }

    breakdown.surgeMultiplier = multiplier;
    breakdown.surgeFee = Math.round(breakdown.baseShippingFee * (multiplier - 1.0));
    if (multiplier > 1.0) {
      breakdown.appliedRules.push(this.name);
    }
  }
}

/**
 * Evaluates weather conditions (RAIN / STORM) with Graceful Fallback if external provider fails.
 */
export class WeatherSurgePricingRule implements PricingRule {
  readonly name = 'WeatherSurgePricingRule';

  evaluate(context: PricingContext, breakdown: PricingBreakdown): void {
    try {
      const weather = context.weatherCondition ?? 'CLEAR';
      let fee = 0;
      if (weather === 'STORM') {
        fee = 25000;
      } else if (weather === 'RAIN') {
        fee = 10000;
      }

      breakdown.weatherFee = fee;
      if (fee > 0) {
        breakdown.appliedRules.push(this.name);
      }
    } catch {
      // Graceful fallback to zero fee without crashing
      breakdown.weatherFee = 0;
    }
  }
}

/**
 * Applies night delivery surcharge (10,000 VND) between 22:00 and 06:00.
 */
export class NightSurgePricingRule implements PricingRule {
  readonly name = 'NightSurgePricingRule';

  evaluate(context: PricingContext, breakdown: PricingBreakdown): void {
    const hour = context.requestHour ?? new Date().getHours();
    const isNight = hour >= 22 || hour < 6;

    if (isNight) {
      breakdown.nightFee = 10000;
      breakdown.appliedRules.push(this.name);
    } else {
      breakdown.nightFee = 0;
    }
  }
}

