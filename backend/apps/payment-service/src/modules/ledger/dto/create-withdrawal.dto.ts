import { IsUUID, IsEnum, IsNumber, Min, IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateWithdrawalDto {
  @IsUUID()
  wallet_account_id: string;

  @IsUUID()
  requester_id: string;

  @IsEnum(['DRIVER', 'RESTAURANT'], {
    message: 'requester_type must be either DRIVER or RESTAURANT',
  })
  requester_type: 'DRIVER' | 'RESTAURANT';

  @IsNumber()
  @Min(50000, { message: 'Số tiền rút tối thiểu là 50.000 VND' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'bank_code không được để trống' })
  bank_code: string;

  @IsString()
  @IsNotEmpty({ message: 'bank_account_number không được để trống' })
  @Length(6, 30, { message: 'Số tài khoản ngân hàng không hợp lệ' })
  bank_account_number: string;

  @IsString()
  @IsNotEmpty({ message: 'bank_account_name không được để trống' })
  bank_account_name: string;
}
