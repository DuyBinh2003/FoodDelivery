import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ApproveWithdrawalDto {
  @IsString()
  @IsNotEmpty({ message: 'bank_transaction_ref không được để trống' })
  bank_transaction_ref: string;

  @IsOptional()
  @IsUUID()
  processed_by?: string;
}
