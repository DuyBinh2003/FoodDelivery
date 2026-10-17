import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethod {
  CASH = 'CASH',
  MOMO = 'MOMO',
  VNPAY = 'VNPAY',
}

export class CreateOrderItemDto {
  @IsUUID()
  menu_item_id: string;

  @IsOptional()
  @IsString()
  name?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unit_price: number;
}

export class CreateOrderDto {
  @IsUUID()
  restaurant_id: string;

  @IsString()
  @IsNotEmpty()
  delivery_address: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

