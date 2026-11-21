import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ProofType } from '@/modules/dispatch/entities/delivery-proof.entity.js';

export class CreateDeliveryProofDto {
  @IsNotEmpty({ message: 'driverId không được để trống' })
  @IsUUID('4', { message: 'driverId phải là UUID v4 hợp lệ' })
  driver_id: string;

  @IsNotEmpty({ message: 'proofType không được để trống' })
  @IsEnum(ProofType, { message: 'proofType phải là PICKED_UP hoặc DELIVERED' })
  proof_type: ProofType;

  @IsNotEmpty({ message: 'imageUrl không được để trống' })
  @IsString({ message: 'imageUrl phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'imageUrl không vượt quá 500 ký tự' })
  image_url: string;

  @IsNotEmpty({ message: 'capturedLat không được để trống' })
  @IsNumber({}, { message: 'capturedLat phải là số thực' })
  captured_lat: number;

  @IsNotEmpty({ message: 'capturedLng không được để trống' })
  @IsNumber({}, { message: 'capturedLng phải là số thực' })
  captured_lng: number;

  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi ký tự' })
  @MaxLength(1000, { message: 'notes không vượt quá 1000 ký tự' })
  notes?: string;
}
