import { IsInt, IsOptional, IsString, IsArray, Min, Max, MaxLength } from 'class-validator';

export class CreateOrderReviewDto {
  @IsOptional()
  @IsInt({ message: 'restaurant_rating must be an integer' })
  @Min(1, { message: 'restaurant_rating must be at least 1' })
  @Max(5, { message: 'restaurant_rating cannot exceed 5' })
  restaurant_rating?: number;

  @IsOptional()
  @IsInt({ message: 'driver_rating must be an integer' })
  @Min(1, { message: 'driver_rating must be at least 1' })
  @Max(5, { message: 'driver_rating cannot exceed 5' })
  driver_rating?: number;

  @IsOptional()
  @IsInt({ message: 'food_rating must be an integer' })
  @Min(1, { message: 'food_rating must be at least 1' })
  @Max(5, { message: 'food_rating cannot exceed 5' })
  food_rating?: number;

  @IsOptional()
  @IsString({ message: 'comment must be a string' })
  @MaxLength(1000, { message: 'comment cannot exceed 1000 characters' })
  comment?: string;

  @IsOptional()
  @IsArray({ message: 'image_urls must be an array' })
  @IsString({ each: true, message: 'each image_url must be a string' })
  image_urls?: string[];
}
