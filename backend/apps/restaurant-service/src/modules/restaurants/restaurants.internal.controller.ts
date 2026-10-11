import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { Config } from '@/modules/restaurants/entities/config.entity.js';

@Controller('internal')
export class RestaurantsInternalController {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem) private readonly menuRepo: Repository<MenuItem>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Config) private readonly configRepo: Repository<Config>,
  ) {}

  @Get('restaurants/metrics')
  async getMetrics(): Promise<{ totalRestaurants: number }> {
    return {
      totalRestaurants: await this.restaurantRepo.count(),
    };
  }

  @Get('restaurants/categories')
  async getCategories(): Promise<Category[]> {
    return this.categoryRepo.find({ where: { is_deleted: false } });
  }

  @Get('restaurants/tags')
  async getTags(): Promise<Tag[]> {
    return this.tagRepo.find({ where: { is_deleted: false } });
  }

  @Get('restaurants/menu-items')
  async getMenuItems(
    @Query('restaurantIds') restaurantIds?: string,
    @Query('q') q?: string,
    @Query('tags') tags?: string,
  ): Promise<MenuItem[]> {
    if (!restaurantIds) return [];
    const ids = restaurantIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return [];

    const qb = this.menuRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.tags', 'tag')
      .where('item.restaurant_id IN (:...ids)', { ids })
      .andWhere('item.is_deleted = false')
      .andWhere('item.is_available = true');

    if (q) {
      qb.andWhere('item.name ILIKE :q', { q: `%${q}%` });
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        qb.andWhere('tag.name IN (:...tagList)', { tagList });
      }
    }

    return qb.getMany();
  }

  @Get('restaurants/configs/freeship')
  async getFreeshipConfig(): Promise<number> {
    const config = await this.configRepo.findOne({
      where: { key: 'freeship_distance_threshold', is_deleted: false },
    });
    return config ? Number(config.value) : 2;
  }

  @Get('restaurants/:id/menu')
  async getMenu(@Param('id') id: string): Promise<MenuItem[]> {
    return this.menuRepo.find({ where: { restaurant_id: id, is_deleted: false } });
  }

  @Post('restaurants/:id/approve')
  async approveRestaurant(@Param('id') id: string): Promise<Restaurant | null> {
    const restaurant = await this.restaurantRepo.findOne({ where: { id } });
    if (restaurant) {
      restaurant.verification_status = 'APPROVED';
      await this.restaurantRepo.save(restaurant);
    }
    return restaurant;
  }

  @Post('restaurants/:id/reject')
  async rejectRestaurant(@Param('id') id: string): Promise<Restaurant | null> {
    const restaurant = await this.restaurantRepo.findOne({ where: { id } });
    if (restaurant) {
      restaurant.verification_status = 'REJECTED';
      await this.restaurantRepo.save(restaurant);
    }
    return restaurant;
  }
}
