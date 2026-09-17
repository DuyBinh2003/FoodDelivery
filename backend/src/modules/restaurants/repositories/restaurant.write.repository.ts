import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { CreateRestaurantDto } from '@/modules/restaurants/dto/create-restaurant.dto.js';
import { CreateMenuItemDto } from '@/modules/restaurants/dto/create-menu-item.dto.js';

@Injectable()
export class RestaurantWriteRepository {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const restaurant = this.restaurantRepo.create(createRestaurantDto);
    return this.restaurantRepo.save(restaurant);
  }

  async save(restaurant: Restaurant): Promise<Restaurant> {
    return this.restaurantRepo.save(restaurant);
  }

  async createMenuItem(restaurantId: string, createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const menuItem = this.menuItemRepo.create({
      ...createMenuItemDto,
      restaurant_id: restaurantId,
    });
    return this.menuItemRepo.save(menuItem);
  }

  async saveMenuItem(menuItem: MenuItem): Promise<MenuItem> {
    return this.menuItemRepo.save(menuItem);
  }
}
