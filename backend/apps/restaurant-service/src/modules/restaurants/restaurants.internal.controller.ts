import { Controller, Get, Post, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';

@Controller('internal')
export class RestaurantsInternalController {
  constructor(
    @InjectRepository(Restaurant) private restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem) private menuRepo: Repository<MenuItem>
  ) {}

  @Get('restaurants/metrics')
  async getMetrics() {
    return {
      totalRestaurants: await this.restaurantRepo.count()
    };
  }

  @Get('restaurants/:id/menu')
  async getMenu(@Param('id') id: string) {
    return this.menuRepo.find({ where: { restaurant: { id } } });
  }

  @Post('restaurants/:id/approve')
  async approveRestaurant(@Param('id') id: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id } });
    if (restaurant) {
      restaurant.verification_status = 'APPROVED';
      await this.restaurantRepo.save(restaurant);
    }
    return restaurant;
  }

  @Post('restaurants/:id/reject')
  async rejectRestaurant(@Param('id') id: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id } });
    if (restaurant) {
      restaurant.verification_status = 'REJECTED';
      await this.restaurantRepo.save(restaurant);
    }
    return restaurant;
  }
}
