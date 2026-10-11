import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { UpdateRestaurantProfileDto } from '@/modules/restaurants/dto/update-restaurant-profile.dto.js';

export interface UpdatePartnerRestaurantProfileCommand {
  ownerId: string;
  dto: UpdateRestaurantProfileDto;
}

@Injectable()
export class UpdatePartnerRestaurantProfileUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(RestaurantWriteRepository)
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
  ) {}

  async execute(command: UpdatePartnerRestaurantProfileCommand): Promise<Restaurant> {
    const restaurant = await this.restaurantReadRepo.findByOwnerId(command.ownerId);
    if (!restaurant) {
      throw new NotFoundException('Không tìm thấy nhà hàng để cập nhật thông tin');
    }

    if (command.dto.name !== undefined) {
      restaurant.name = command.dto.name;
    }
    if (command.dto.address !== undefined) {
      restaurant.address = command.dto.address;
    }

    let savedRestaurant = await this.restaurantWriteRepo.save(restaurant);

    if (command.dto.category_ids !== undefined) {
      savedRestaurant = await this.restaurantWriteRepo.updateRestaurantCategories(
        savedRestaurant,
        command.dto.category_ids,
      );
    }

    return savedRestaurant;
  }
}
