import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsNumber, Min, Max, IsDateString } from 'class-validator';
import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(VoucherType)
  voucher_type: VoucherType;

  @IsEnum(VoucherSponsor)
  sponsor_type: VoucherSponsor;

  @IsOptional()
  @IsUUID()
  restaurant_id?: string;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  max_discount_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  @IsNumber()
  @Min(1)
  total_quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  max_usage_per_user?: number;

  @IsDateString()
  valid_from: string;

  @IsDateString()
  valid_to: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  start_hour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(23)
  end_hour?: number;
}
