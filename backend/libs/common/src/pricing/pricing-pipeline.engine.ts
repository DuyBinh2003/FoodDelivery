/**
 * @file pricing-pipeline.engine.ts
 * @description Pipeline Engine executing pricing rules in sequence to produce complete cost breakdown.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  PricingContext,
  PricingBreakdown,
  PricingRule,
  DistancePricingRule,
  SurgeDemandPricingRule,
  WeatherSurgePricingRule,
  NightSurgePricingRule,
} from '@/common/pricing/pricing-rules.js';

@Injectable()
export class PricingPipelineEngine {
  private readonly logger = new Logger(PricingPipelineEngine.name);
  private rules: PricingRule[] = [];

  constructor() {
    // Default standard pipeline rules
    this.rules = [
      new DistancePricingRule(),
      new SurgeDemandPricingRule(),
      new WeatherSurgePricingRule(),
      new NightSurgePricingRule(),
    ];
  }

  /**
   * Replaces or configures active pipeline rules dynamically.
   */
  setRules(customRules: PricingRule[]): void {
    this.rules = [...customRules];
  }

  /**
   * Appends an additional pricing rule to the end of pipeline.
   */
  addRule(rule: PricingRule): void {
    this.rules.push(rule);
  }

  /**
   * Evaluates pricing context through all registered rules and calculates the final breakdown.
   */
  async calculate(context: PricingContext): Promise<PricingBreakdown> {
    const itemsSubtotal = (context.items || []).reduce(
      (sum, item) => sum + Math.max(item.quantity, 0) * Math.max(item.unit_price, 0),
      0,
    );

    const breakdown: PricingBreakdown = {
      itemsSubtotal,
      baseShippingFee: 15000,
      surgeMultiplier: 1.0,
      surgeFee: 0,
      weatherFee: 0,
      nightFee: 0,
      discountAmount: Math.max(context.voucherDiscount ?? 0, 0),
      totalShippingFee: 0,
      totalAmount: 0,
      appliedRules: [],
    };

    for (const rule of this.rules) {
      try {
        await rule.evaluate(context, breakdown);
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Rule [${rule.name}] failed during evaluation: ${msg}`);
      }
    }

    breakdown.totalShippingFee =
      breakdown.baseShippingFee +
      breakdown.surgeFee +
      breakdown.weatherFee +
      breakdown.nightFee;

    const netItemsSubtotal = Math.max(0, breakdown.itemsSubtotal - breakdown.discountAmount);
    breakdown.totalAmount = netItemsSubtotal + breakdown.totalShippingFee;

    return breakdown;
  }
}

