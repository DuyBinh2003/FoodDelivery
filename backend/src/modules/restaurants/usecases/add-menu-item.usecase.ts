import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { CreateMenuItemDto } from '@/modules/restaurants/dto/create-menu-item.dto.js';

export interface AddMenuItemCommand {
  restaurantId: string;
  dto: CreateMenuItemDto;
}

@Injectable()
export class AddMenuItemUseCase {
  constructor(
    private readonly restaurantReadRepo: RestaurantReadRepository,
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: AddMenuItemCommand): Promise<MenuItem> {
    const restaurant = await this.restaurantReadRepo.findById(command.restaurantId);
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${command.restaurantId} not found`);
    }

    const savedItem = await this.restaurantWriteRepo.createMenuItem(command.restaurantId, command.dto);
    
    await this.cacheManager.del(`restaurant:${command.restaurantId}:menu`);
    return savedItem;
  }
}
