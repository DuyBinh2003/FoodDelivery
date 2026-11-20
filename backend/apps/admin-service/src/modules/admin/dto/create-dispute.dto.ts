import { IsUUID, IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateDisputeDto {
  @IsUUID()
  order_id: string;

  @IsUUID()
  customer_id: string;

  @IsString()
  @IsNotEmpty({ message: 'Lý do khiếu nại không được để trống' })
  reason_code: string;

  @IsString()
  @IsNotEmpty({ message: 'Mô tả sự cố không được để trống' })
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidence_images?: string[];
}
