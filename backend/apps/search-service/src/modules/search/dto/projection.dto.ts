import { IsBoolean, IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateMenuItemProjectionDto {
  @IsOptional()
  @IsBoolean()
  is_available?: boolean;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  name?: string;
}

export class UpdateRestaurantProjectionDto {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}
