import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';

export interface UpdatePartnerRestaurantStatusCommand {
  ownerId: string;
  isActive: boolean;
}

@Injectable()
export class UpdatePartnerRestaurantStatusUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(RestaurantWriteRepository)
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: UpdatePartnerRestaurantStatusCommand): Promise<Restaurant> {
    const restaurant = await this.restaurantReadRepo.findByOwnerId(command.ownerId);
    if (!restaurant) {
      throw new NotFoundException('Không tìm thấy nhà hàng để cập nhật trạng thái');
    }

    restaurant.is_active = command.isActive;
    const updated = await this.restaurantWriteRepo.save(restaurant);

    await this.cacheManager.del(`restaurant:${restaurant.id}:menu`);
    return updated;
  }
}
