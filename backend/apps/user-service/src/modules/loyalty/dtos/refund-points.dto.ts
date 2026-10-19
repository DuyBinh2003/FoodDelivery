import { IsNotEmpty, IsUUID, IsString } from 'class-validator';

export class RefundPointsDto {
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @IsNotEmpty()
  @IsString()
  order_id: string;

  @IsNotEmpty()
  @IsString()
  idempotency_key: string;
}
