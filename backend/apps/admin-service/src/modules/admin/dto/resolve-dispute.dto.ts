import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ResolutionAction, PenaltyParty } from '@/modules/admin/entities/order-dispute.entity.js';

export class ResolveDisputeDto {
  @IsEnum(ResolutionAction, {
    message: 'Hành động xử lý phải là FULL_REFUND, PARTIAL_REFUND, VOUCHER_COMPENSATION hoặc REJECT',
  })
  resolution_action: ResolutionAction;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Số tiền bồi hoàn không được âm' })
  refund_amount?: number;

  @IsOptional()
  @IsEnum(PenaltyParty, {
    message: 'Bên chịu phạt phải là DRIVER, RESTAURANT hoặc PLATFORM',
  })
  penalty_party?: PenaltyParty;

  @IsOptional()
  @IsString()
  resolution_notes?: string;

  @IsOptional()
  @IsString()
  assigned_cs_id?: string;
}
