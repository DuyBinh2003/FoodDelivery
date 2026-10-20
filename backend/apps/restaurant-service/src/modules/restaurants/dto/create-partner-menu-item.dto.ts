import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Min, IsUUID, IsArray } from 'class-validator';

export class CreatePartnerMenuItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  original_price?: number;

  @IsArray()
  @IsOptional()
  options?: Array<{
    id: string;
    name: string;
    required: boolean;
    min_choices?: number;
    max_choices?: number;
    choices: Array<{
      id: string;
      name: string;
      price: number;
      is_default?: boolean;
    }>;
  }>;

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
