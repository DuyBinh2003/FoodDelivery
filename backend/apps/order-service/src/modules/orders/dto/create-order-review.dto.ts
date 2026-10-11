import { IsNumber, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';

export class CreateOrderReviewDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  restaurant_rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  driver_rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  food_rating?: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];
}
