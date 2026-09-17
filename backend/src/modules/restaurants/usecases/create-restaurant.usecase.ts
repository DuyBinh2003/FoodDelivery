import { Injectable, Inject } from '@nestjs/common';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { CreateRestaurantDto } from '@/modules/restaurants/dto/create-restaurant.dto.js';

@Injectable()
export class CreateRestaurantUseCase {
  constructor(@Inject(RestaurantWriteRepository) private readonly restaurantWriteRepo: RestaurantWriteRepository) {}

  async execute(dto: CreateRestaurantDto): Promise<Restaurant> {
    return this.restaurantWriteRepo.create(dto);
  }
}
