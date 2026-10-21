import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class MoMoWebhookDto {
  @IsString()
  @IsNotEmpty()
  partnerCode: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  orderInfo: string;

  @IsString()
  @IsNotEmpty()
  orderType: string;

  @IsNumber()
  transId: number;

  @IsNumber()
  resultCode: number;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  payType?: string;

  @IsNumber()
  responseTime: number;

  @IsOptional()
  @IsString()
  extraData?: string;

  @IsString()
  @IsNotEmpty()
  signature: string;
}
