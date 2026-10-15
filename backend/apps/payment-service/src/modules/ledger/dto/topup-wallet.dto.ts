import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class TopupWalletDto {
  @IsUUID()
  @IsNotEmpty()
  walletAccountId!: string;

  @IsString()
  @IsNotEmpty()
  amount!: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey!: string;

  @IsString()
  @IsNotEmpty()
  paymentMethod!: string; // 'MOCK', 'VNPAY', 'MOMO', 'STRIPE'

  @IsString()
  @IsNotEmpty()
  referenceId!: string;
}
