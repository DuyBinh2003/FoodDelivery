import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  current_location_lat?: number;

  @IsOptional()
  @IsNumber()
  current_location_lng?: number;
}
