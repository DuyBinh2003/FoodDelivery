import { Injectable, Inject } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';

@Injectable()
export class GetRestaurantsUseCase {
  constructor(@Inject(RestaurantReadRepository) private readonly restaurantReadRepo: RestaurantReadRepository) {}

  async execute(): Promise<Restaurant[]> {
    return this.restaurantReadRepo.findAll();
  }
}
