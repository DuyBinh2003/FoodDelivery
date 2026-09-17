import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';

@Injectable()
export class RestaurantReadRepository {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepo.find({ where: { is_deleted: false } });
  }

  async findById(id: string): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({
      where: { id, is_deleted: false },
    });
  }

  async findMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return this.menuItemRepo.find({
      where: { restaurant_id: restaurantId, is_deleted: false },
      order: { created_at: 'DESC' }
    });
  }

  async findMenuItemById(itemId: string, restaurantId: string): Promise<MenuItem | null> {
    return this.menuItemRepo.findOne({
      where: { id: itemId, restaurant_id: restaurantId, is_deleted: false },
    });
  }
}
