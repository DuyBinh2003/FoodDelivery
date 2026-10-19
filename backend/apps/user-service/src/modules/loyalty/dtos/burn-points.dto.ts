import { IsNotEmpty, IsUUID, IsInt, Min, IsString, IsOptional, IsNumber } from 'class-validator';

export class BurnPointsDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsInt()
  @Min(100, { message: 'Số điểm tối thiểu để quy đổi là 100 điểm' })
  points: number;

  @IsOptional()
  @IsNumber()
  max_discount_amount?: number;

  @IsNotEmpty()
  @IsString()
  idempotency_key: string;
}
