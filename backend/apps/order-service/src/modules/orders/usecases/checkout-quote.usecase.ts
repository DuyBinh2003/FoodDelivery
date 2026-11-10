/**
 * @file checkout-quote.usecase.ts
 * @description Generates dynamic pricing breakdown and issues signed 5-minute Price Lock Ticket.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { CheckoutQuoteDto } from '@/modules/orders/dto/checkout-quote.dto.js';
import { PricingPipelineEngine } from '@/common/pricing/pricing-pipeline.engine.js';
import {
  PriceLockTicketService,
  PriceLockTicket,
} from '@/common/pricing/price-lock-ticket.service.js';

@Injectable()
export class CheckoutQuoteUseCase {
  constructor(
    @Inject(PricingPipelineEngine)
    private readonly pricingEngine: PricingPipelineEngine,
    @Inject(PriceLockTicketService)
    private readonly priceLockTicketService: PriceLockTicketService,
  ) {}

  async execute(dto: CheckoutQuoteDto): Promise<PriceLockTicket> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không có món ăn nào để báo giá.');
    }

    // 1. Chạy qua Pricing Pipeline Rules Engine
    const breakdown = await this.pricingEngine.calculate({
      items: dto.items.map((i) => ({
        menu_item_id: i.menu_item_id,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      distanceKm: dto.distance_km ?? 2.0,
      activeOrdersInArea: dto.active_orders_in_area ?? 10,
      availableDriversInArea: dto.available_drivers_in_area ?? 10,
      weatherCondition: dto.weather_condition ?? 'CLEAR',
      voucherDiscount: dto.voucher_discount ?? 0,
    });

    // 2. Phát hành PriceLockTicket có chữ ký số HMAC và TTL 300s
    return this.priceLockTicketService.createTicket({
      restaurantId: dto.restaurant_id,
      breakdown,
      items: dto.items.map((i) => ({
        menu_item_id: i.menu_item_id,
        name: i.name,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
      ttlSeconds: 300,
    });
  }
}

