import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class VnPayWebhookDto {
  @IsString()
  @IsNotEmpty()
  vnp_TmnCode: string;

  @IsString()
  @IsNotEmpty()
  vnp_Amount: string;

  @IsString()
  @IsNotEmpty()
  vnp_BankCode: string;

  @IsOptional()
  @IsString()
  vnp_BankTranNo?: string;

  @IsOptional()
  @IsString()
  vnp_CardType?: string;

  @IsOptional()
  @IsString()
  vnp_PayDate?: string;

  @IsString()
  @IsNotEmpty()
  vnp_OrderInfo: string;

  @IsString()
  @IsNotEmpty()
  vnp_TransactionNo: string;

  @IsString()
  @IsNotEmpty()
  vnp_ResponseCode: string;

  @IsString()
  @IsNotEmpty()
  vnp_TxnRef: string;

  @IsString()
  @IsNotEmpty()
  vnp_SecureHash: string;

  @IsOptional()
  @IsString()
  vnp_SecureHashType?: string;
}
