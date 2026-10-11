import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min, IsUUID, IsArray } from 'class-validator';

export class CreatePartnerMenuItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  is_available?: boolean;

  @IsUUID()
  @IsOptional()
  category_id?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  tag_ids?: string[];
}
