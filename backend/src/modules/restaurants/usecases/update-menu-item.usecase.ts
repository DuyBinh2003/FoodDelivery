import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { UpdateMenuItemDto } from '@/modules/restaurants/dto/update-menu-item.dto.js';

export interface UpdateMenuItemCommand {
  restaurantId: string;
  itemId: string;
  dto: UpdateMenuItemDto;
}

@Injectable()
export class UpdateMenuItemUseCase {
  constructor(
    private readonly restaurantReadRepo: RestaurantReadRepository,
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: UpdateMenuItemCommand): Promise<MenuItem> {
    const menuItem = await this.restaurantReadRepo.findMenuItemById(command.itemId, command.restaurantId);
    if (!menuItem) {
      throw new NotFoundException(`MenuItem with ID ${command.itemId} not found in Restaurant ${command.restaurantId}`);
    }

    Object.assign(menuItem, command.dto);
    const updatedItem = await this.restaurantWriteRepo.saveMenuItem(menuItem);

    await this.cacheManager.del(`restaurant:${command.restaurantId}:menu`);
    return updatedItem;
  }
}
