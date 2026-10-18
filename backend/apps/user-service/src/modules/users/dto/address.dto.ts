import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { AddressLabel } from '@/modules/users/entities/user-address.entity.js';

export class CreateAddressDto {
  @IsNotEmpty({ message: 'Tên người nhận không được để trống' })
  @IsString()
  recipient_name: string;

  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @IsString()
  recipient_phone: string;

  @IsOptional()
  @IsEnum(AddressLabel, { message: 'Nhãn địa chỉ phải là HOME, WORK hoặc OTHER' })
  label?: AddressLabel;

  @IsNotEmpty({ message: 'Địa chỉ đường/số nhà không được để trống' })
  @IsString()
  street_address: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsNotEmpty({ message: 'Địa chỉ đầy đủ không được để trống' })
  @IsString()
  full_address: string;

  @IsNotEmpty({ message: 'Vĩ độ không được để trống' })
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ tối thiểu là -90' })
  @Max(90, { message: 'Vĩ độ tối đa là 90' })
  latitude: number;

  @IsNotEmpty({ message: 'Kinh độ không được để trống' })
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ tối thiểu là -180' })
  @Max(180, { message: 'Kinh độ tối đa là 180' })
  longitude: number;

  @IsOptional()
  @IsString()
  delivery_notes?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  recipient_name?: string;

  @IsOptional()
  @IsString()
  recipient_phone?: string;

  @IsOptional()
  @IsEnum(AddressLabel, { message: 'Nhãn địa chỉ phải là HOME, WORK hoặc OTHER' })
  label?: AddressLabel;

  @IsOptional()
  @IsString()
  street_address?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  full_address?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Vĩ độ phải là số hợp lệ' })
  @Min(-90, { message: 'Vĩ độ tối thiểu là -90' })
  @Max(90, { message: 'Vĩ độ tối đa là 90' })
  latitude?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Kinh độ phải là số hợp lệ' })
  @Min(-180, { message: 'Kinh độ tối thiểu là -180' })
  @Max(180, { message: 'Kinh độ tối đa là 180' })
  longitude?: number;

  @IsOptional()
  @IsString()
  delivery_notes?: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
