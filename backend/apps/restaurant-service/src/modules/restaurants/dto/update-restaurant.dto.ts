import { PartialType } from '@nestjs/mapped-types';
import { CreateRestaurantDto } from '@/modules/restaurants/dto/create-restaurant.dto.js';

export class UpdateRestaurantDto extends PartialType(CreateRestaurantDto) {}
