import { IsString, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLocationDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  restaurantName: string;

  @IsString()
  @IsNotEmpty()
  restaurantAddress: string;

  @IsNumber()
  restaurantLat: number;

  @IsNumber()
  restaurantLng: number;

  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @IsNumber()
  deliveryLat: number;

  @IsNumber()
  deliveryLng: number;
}

export class EvaluateStackingDto {
  @ValidateNested()
  @Type(() => OrderLocationDto)
  primaryOrder: OrderLocationDto;

  @ValidateNested()
  @Type(() => OrderLocationDto)
  candidateOrder: OrderLocationDto;
}
