import { IsUUID, IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDriverLocationDto {
  @IsUUID()
  orderId: string;

  @IsUUID()
  driverId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  heading?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  speed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dropoff_lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dropoff_lng?: number;
}
