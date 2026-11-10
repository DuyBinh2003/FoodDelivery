/**
 * @file pricing.module.ts
 * @description Dynamic Pricing & Price Lock Ticket Module.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PricingPipelineEngine } from '@/common/pricing/pricing-pipeline.engine.js';
import { PriceLockTicketService } from '@/common/pricing/price-lock-ticket.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PricingPipelineEngine, PriceLockTicketService],
  exports: [PricingPipelineEngine, PriceLockTicketService],
})
export class PricingModule {}

