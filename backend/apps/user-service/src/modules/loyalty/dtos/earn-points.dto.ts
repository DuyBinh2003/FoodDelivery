import { IsNotEmpty, IsUUID, IsNumber, Min, IsString } from 'class-validator';

export class EarnPointsDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  qualifying_amount: number;

  @IsNotEmpty()
  @IsString()
  idempotency_key: string;
}
