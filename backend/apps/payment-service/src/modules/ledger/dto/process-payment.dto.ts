import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export enum PaymentMethodType {
  WALLET = 'WALLET',
  COD = 'COD',
}

export class ProcessPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @IsUUID()
  @IsNotEmpty()
  customerId!: string;

  @IsUUID()
  @IsNotEmpty()
  restaurantId!: string;

  @IsString()
  @IsNotEmpty()
  amount!: string;

  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  paymentMethod!: PaymentMethodType;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;
}
