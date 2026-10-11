import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { CreatePartnerMenuItemDto } from '@/modules/restaurants/dto/create-partner-menu-item.dto.js';

export interface CreatePartnerMenuItemCommand {
  ownerId: string;
  dto: CreatePartnerMenuItemDto;
}

@Injectable()
export class CreatePartnerMenuItemUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(RestaurantWriteRepository)
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async execute(command: CreatePartnerMenuItemCommand): Promise<MenuItem> {
    const restaurant = await this.restaurantReadRepo.findByOwnerId(command.ownerId);
    if (!restaurant) {
      throw new NotFoundException('Không tìm thấy nhà hàng để tạo món ăn');
    }

    const savedItem = await this.restaurantWriteRepo.createPartnerMenuItem(restaurant.id, command.dto);
    await this.cacheManager.del(`restaurant:${restaurant.id}:menu`);

    const fullItem = await this.restaurantReadRepo.findMenuItemById(savedItem.id, restaurant.id);
    return fullItem || savedItem;
  }
}
