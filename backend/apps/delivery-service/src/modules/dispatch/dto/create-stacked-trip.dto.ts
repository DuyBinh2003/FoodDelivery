import { IsUUID, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderLocationDto } from '@/modules/dispatch/dto/evaluate-stacking.dto.js';

export class CreateStackedTripDto {
  @IsUUID()
  @IsNotEmpty()
  driverId: string;

  @ValidateNested()
  @Type(() => OrderLocationDto)
  primaryOrder: OrderLocationDto;

  @ValidateNested()
  @Type(() => OrderLocationDto)
  secondaryOrder: OrderLocationDto;
}
