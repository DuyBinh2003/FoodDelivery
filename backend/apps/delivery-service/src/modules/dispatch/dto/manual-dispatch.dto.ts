import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ManualDispatchDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsOptional()
  @IsString()
  restaurantName?: string;

  @IsOptional()
  @IsString()
  restaurantAddress?: string;

  @IsOptional()
  @IsNumber()
  restaurantLat?: number;

  @IsOptional()
  @IsNumber()
  restaurantLng?: number;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsNumber()
  deliveryLat?: number;

  @IsOptional()
  @IsNumber()
  deliveryLng?: number;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  driverEarnings?: number;

  @IsOptional()
  @IsNumber()
  itemsCount?: number;
}
