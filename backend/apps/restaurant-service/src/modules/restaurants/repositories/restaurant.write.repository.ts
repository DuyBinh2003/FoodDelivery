import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { CreateRestaurantDto } from '@/modules/restaurants/dto/create-restaurant.dto.js';
import { CreateMenuItemDto } from '@/modules/restaurants/dto/create-menu-item.dto.js';
import { CreatePartnerMenuItemDto } from '@/modules/restaurants/dto/create-partner-menu-item.dto.js';
import { UpdatePartnerMenuItemDto } from '@/modules/restaurants/dto/update-partner-menu-item.dto.js';

@Injectable()
export class RestaurantWriteRepository {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const restaurant = this.restaurantRepo.create(createRestaurantDto);
    return this.restaurantRepo.save(restaurant);
  }

  async save(restaurant: Restaurant): Promise<Restaurant> {
    return this.restaurantRepo.save(restaurant);
  }

  async updateRestaurantCategories(restaurant: Restaurant, categoryIds: string[]): Promise<Restaurant> {
    if (categoryIds.length > 0) {
      const categories = await this.categoryRepo.findBy({ id: In(categoryIds) });
      restaurant.categories = categories;
    } else {
      restaurant.categories = [];
    }
    return this.restaurantRepo.save(restaurant);
  }

  async createMenuItem(restaurantId: string, createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    const menuItem = this.menuItemRepo.create({
      ...createMenuItemDto,
      restaurant_id: restaurantId,
    });
    return this.menuItemRepo.save(menuItem);
  }

  async createPartnerMenuItem(restaurantId: string, dto: CreatePartnerMenuItemDto): Promise<MenuItem> {
    const { tag_ids, ...itemData } = dto;
    const menuItem = this.menuItemRepo.create({
      ...itemData,
      restaurant_id: restaurantId,
    });

    if (tag_ids && tag_ids.length > 0) {
      menuItem.tags = await this.tagRepo.findBy({ id: In(tag_ids) });
    }

    return this.menuItemRepo.save(menuItem);
  }

  async updatePartnerMenuItem(menuItem: MenuItem, dto: UpdatePartnerMenuItemDto): Promise<MenuItem> {
    const { tag_ids, ...updateData } = dto;
    Object.assign(menuItem, updateData);

    if (tag_ids !== undefined) {
      if (tag_ids.length > 0) {
        menuItem.tags = await this.tagRepo.findBy({ id: In(tag_ids) });
      } else {
        menuItem.tags = [];
      }
    }

    return this.menuItemRepo.save(menuItem);
  }

  async saveMenuItem(menuItem: MenuItem): Promise<MenuItem> {
    return this.menuItemRepo.save(menuItem);
  }

  async createTag(name: string): Promise<Tag> {
    const tag = this.tagRepo.create({ name: name.trim() });
    return this.tagRepo.save(tag);
  }
}
