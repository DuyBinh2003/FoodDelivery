import { IsString, IsNotEmpty, IsUUID, IsNumber, Min, IsOptional } from 'class-validator';

export class ValidateVoucherDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsUUID()
  restaurant_id: string;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_fee?: number;

  @IsOptional()
  @IsUUID()
  customer_id?: string;
}
