import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';

export interface DeleteRestaurantCommand {
  restaurantId: string;
}

@Injectable()
export class DeleteRestaurantUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(RestaurantWriteRepository)
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: DeleteRestaurantCommand): Promise<void> {
    const restaurant = await this.restaurantReadRepo.findById(command.restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${command.restaurantId} not found`);
    }

    restaurant.is_deleted = true;
    await this.restaurantWriteRepo.save(restaurant);
    
    await this.cacheManager.del(`restaurant:${command.restaurantId}:menu`);
  }
}
