import { Injectable, NotFoundException } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';

export interface GetRestaurantQuery {
  restaurantId: string;
}

@Injectable()
export class GetRestaurantUseCase {
  constructor(private readonly restaurantReadRepo: RestaurantReadRepository) {}

  async execute(query: GetRestaurantQuery): Promise<Restaurant> {
    const restaurant = await this.restaurantReadRepo.findById(query.restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${query.restaurantId} not found`);
    }
    return restaurant;
  }
}
