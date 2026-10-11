import { IsBoolean } from 'class-validator';

export class UpdateRestaurantStatusDto {
  @IsBoolean()
  is_active: boolean;
}
