import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class UpdateRestaurantProfileDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  category_ids?: string[];

  @IsString()
  @IsOptional()
  banner_url?: string;
}
