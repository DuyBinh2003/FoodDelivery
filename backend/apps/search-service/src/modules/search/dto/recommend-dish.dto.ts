import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecommendDishDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dietary?: string[];
}
