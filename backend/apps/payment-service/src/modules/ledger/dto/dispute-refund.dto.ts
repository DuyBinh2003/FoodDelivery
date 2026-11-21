import { IsUUID, IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';

export class DisputeRefundDto {
  @IsUUID()
  disputeId: string;

  @IsUUID()
  orderId: string;

  @IsUUID()
  customerId: string;

  @IsNumber()
  @Min(1000, { message: 'Số tiền bồi hoàn tối thiểu là 1.000 VND' })
  refundAmount: number;

  @IsEnum(['DRIVER', 'RESTAURANT', 'PLATFORM'], {
    message: 'penaltyParty phải là DRIVER, RESTAURANT hoặc PLATFORM',
  })
  penaltyParty: 'DRIVER' | 'RESTAURANT' | 'PLATFORM';

  @IsOptional()
  @IsUUID()
  penaltyPartyId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
