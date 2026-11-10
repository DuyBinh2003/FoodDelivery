/**
 * @file checkout-quote.dto.ts
 * @description DTO for requesting dynamic pricing quote with 5-minute Price Lock Ticket.
 * @traceability docs/plans/platform/dynamic-surge-pricing-and-cart-versioning-engine.md (Issue #84)
 */

import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from '@/modules/orders/dto/create-order.dto.js';
import type { WeatherCondition } from '@/common/pricing/index.js';

export class CheckoutQuoteDto {
  @IsUUID()
  restaurant_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance_km?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  active_orders_in_area?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  available_drivers_in_area?: number;

  @IsOptional()
  @IsEnum(['CLEAR', 'RAIN', 'STORM'])
  weather_condition?: WeatherCondition;

  @IsOptional()
  @IsNumber()
  @Min(0)
  voucher_discount?: number;
}

