import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { UpdatePartnerMenuItemDto } from '@/modules/restaurants/dto/update-partner-menu-item.dto.js';

export interface UpdatePartnerMenuItemCommand {
  ownerId: string;
  itemId: string;
  dto: UpdatePartnerMenuItemDto;
}

@Injectable()
export class UpdatePartnerMenuItemUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(RestaurantWriteRepository)
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: UpdatePartnerMenuItemCommand): Promise<MenuItem> {
    const restaurant = await this.restaurantReadRepo.findByOwnerId(command.ownerId);
    if (!restaurant) {
      throw new NotFoundException('Không tìm thấy nhà hàng');
    }

    const menuItem = await this.restaurantReadRepo.findMenuItemById(command.itemId, restaurant.id);
    if (!menuItem) {
      throw new NotFoundException(`Không tìm thấy món ăn với ID ${command.itemId} trong quán`);
    }

    await this.restaurantWriteRepo.updatePartnerMenuItem(menuItem, command.dto);
    await this.cacheManager.del(`restaurant:${restaurant.id}:menu`);

    const fullItem = await this.restaurantReadRepo.findMenuItemById(command.itemId, restaurant.id);
    return fullItem || menuItem;
  }
}
