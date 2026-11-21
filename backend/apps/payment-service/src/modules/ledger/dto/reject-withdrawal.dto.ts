import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class RejectWithdrawalDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  rejection_reason: string;

  @IsOptional()
  @IsUUID()
  processed_by?: string;
}
