import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsIn, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SuggestSearchDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lon?: number;
}

export class SearchRestaurantsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lon?: number;

  @IsOptional()
  @IsString()
  radius?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  @IsArray()
  categories?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  @IsArray()
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  freeship?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freeshipDistanceThreshold?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  open_only?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['relevance', 'distance', 'rating'])
  sort_by?: 'relevance' | 'distance' | 'rating';
}
