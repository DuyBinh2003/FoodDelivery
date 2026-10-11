import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';

export interface GetPartnerRestaurantQuery {
  ownerId: string;
}

export interface PartnerRestaurantResponse {
  restaurant: Restaurant;
  menuItems: MenuItem[];
}

@Injectable()
export class GetPartnerRestaurantUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
  ) {}

  async execute(query: GetPartnerRestaurantQuery): Promise<PartnerRestaurantResponse> {
    const restaurant = await this.restaurantReadRepo.findByOwnerId(query.ownerId);
    if (!restaurant) {
      throw new NotFoundException('Không tìm thấy thông tin nhà hàng liên kết với tài khoản này');
    }

    const menuItems = await this.restaurantReadRepo.findMenuItems(restaurant.id);

    return {
      restaurant,
      menuItems,
    };
  }
}
