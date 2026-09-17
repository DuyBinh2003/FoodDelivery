import { Injectable, NotFoundException } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { UpdateRestaurantDto } from '@/modules/restaurants/dto/update-restaurant.dto.js';

export interface UpdateRestaurantCommand {
  restaurantId: string;
  dto: UpdateRestaurantDto;
}

@Injectable()
export class UpdateRestaurantUseCase {
  constructor(
    private readonly restaurantReadRepo: RestaurantReadRepository,
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
  ) {}

  async execute(command: UpdateRestaurantCommand): Promise<Restaurant> {
    const restaurant = await this.restaurantReadRepo.findById(command.restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${command.restaurantId} not found`);
    }

    Object.assign(restaurant, command.dto);
    return this.restaurantWriteRepo.save(restaurant);
  }
}
