import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Config } from '@/modules/restaurants/entities/config.entity.js';

@Injectable()
export class SearchReadRepository {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  async getCategories() {
    const categoryRepo = this.dataSource.getRepository(Category);
    return categoryRepo.find({ where: { is_deleted: false } });
  }

  async getTags() {
    const tagRepo = this.dataSource.getRepository(Tag);
    return tagRepo.find();
  }

  async getMenuItemsForRestaurants(restaurantIds: string[], params: any) {
    if (!restaurantIds || restaurantIds.length === 0) {
      return [];
    }

    const menuItemRepo = this.dataSource.getRepository(MenuItem);
    const qb = menuItemRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.tags', 'tag')
      .where('item.restaurant_id IN (:...restaurantIds)', { restaurantIds })
      .andWhere('item.is_deleted = :isDeleted', { isDeleted: false });

    if (params.q) {
      qb.andWhere('item.name ILIKE :q', { q: `%${params.q}%` });
    }

    if (params.tags && params.tags.length > 0) {
      qb.andWhere('tag.id IN (:...tags)', { tags: params.tags });
    }

    return qb.getMany();
  }

  async getFreeshipDistanceThreshold(): Promise<number> {
    try {
      const configRepo = this.dataSource.getRepository(Config);
      const config = await configRepo.findOne({ where: { key: 'freeship_distance_threshold' } });
      if (config && config.value) {
        return Number(config.value);
      }
    } catch (e) {
      console.warn('Could not fetch freeship config, using default 2km', e);
    }
    return 2;
  }
}
