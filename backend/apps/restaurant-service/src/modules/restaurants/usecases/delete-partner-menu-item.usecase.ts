import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';

export interface DeletePartnerMenuItemCommand {
  ownerId: string;
  itemId: string;
}

@Injectable()
export class DeletePartnerMenuItemUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(RestaurantWriteRepository)
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: DeletePartnerMenuItemCommand): Promise<{ success: boolean }> {
    const restaurant = await this.restaurantReadRepo.findByOwnerId(command.ownerId);
    if (!restaurant) {
      throw new NotFoundException('Không tìm thấy nhà hàng');
    }

    const menuItem = await this.restaurantReadRepo.findMenuItemById(command.itemId, restaurant.id);
    if (!menuItem) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${command.itemId}`);
    }

    menuItem.is_deleted = true;
    await this.restaurantWriteRepo.saveMenuItem(menuItem);
    await this.cacheManager.del(`restaurant:${restaurant.id}:menu`);

    return { success: true };
  }
}
