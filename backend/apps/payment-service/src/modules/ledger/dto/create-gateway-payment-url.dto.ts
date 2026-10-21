import { IsNumber, IsString, IsNotEmpty, IsOptional, IsUUID, IsEnum, Min } from 'class-validator';

export enum OnlinePaymentGateway {
  VNPAY = 'VNPAY',
  MOMO = 'MOMO',
}

export class CreateGatewayPaymentUrlDto {
  @IsNumber()
  @Min(1000)
  amount: number;

  @IsEnum(OnlinePaymentGateway)
  paymentMethod: OnlinePaymentGateway;

  @IsUUID()
  @IsNotEmpty()
  walletAccountId: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsString()
  orderInfo?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}
