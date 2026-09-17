import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';

export interface DeleteMenuItemCommand {
  restaurantId: string;
  itemId: string;
}

@Injectable()
export class DeleteMenuItemUseCase {
  constructor(
    private readonly restaurantReadRepo: RestaurantReadRepository,
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: DeleteMenuItemCommand): Promise<void> {
    const menuItem = await this.restaurantReadRepo.findMenuItemById(command.itemId, command.restaurantId);
    if (!menuItem) {
      throw new NotFoundException(`MenuItem with ID ${command.itemId} not found in Restaurant ${command.restaurantId}`);
    }

    menuItem.is_deleted = true;
    await this.restaurantWriteRepo.saveMenuItem(menuItem);

    await this.cacheManager.del(`restaurant:${command.restaurantId}:menu`);
  }
}
