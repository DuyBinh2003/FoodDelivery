import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Restaurant } from './entities/restaurant.entity.js';
import { MenuItem } from './entities/menu-item.entity.js';
import { CreateRestaurantDto } from './dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const restaurant = this.restaurantRepo.create(createRestaurantDto);
    return this.restaurantRepo.save(restaurant);
  }

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepo.find({ where: { is_deleted: false } });
  }

  async findOne(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id, is_deleted: false },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    return restaurant;
  }

  async update(id: string, updateRestaurantDto: UpdateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.findOne(id);
    Object.assign(restaurant, updateRestaurantDto);
    return this.restaurantRepo.save(restaurant);
  }

  async remove(id: string): Promise<void> {
    const restaurant = await this.findOne(id);
    restaurant.is_deleted = true;
    await this.restaurantRepo.save(restaurant);
    // Xoá cache của menu nếu xoá nhà hàng (tuỳ chọn thêm)
    await this.cacheManager.del(`restaurant:${id}:menu`);
  }

  // --- Menu Item Methods ---

  async addMenuItem(restaurantId: string, createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    await this.findOne(restaurantId); // Verify restaurant exists

    const menuItem = this.menuItemRepo.create({
      ...createMenuItemDto,
      restaurant_id: restaurantId,
    });
    const savedItem = await this.menuItemRepo.save(menuItem);
    
    // Invalidate cache
    await this.cacheManager.del(`restaurant:${restaurantId}:menu`);
    return savedItem;
  }

  async findMenuItems(restaurantId: string): Promise<MenuItem[]> {
    await this.findOne(restaurantId); // Verify restaurant exists

    const cacheKey = `restaurant:${restaurantId}:menu`;
    const cachedMenu = await this.cacheManager.get<MenuItem[]>(cacheKey);

    if (cachedMenu) {
      return cachedMenu;
    }

    const menuItems = await this.menuItemRepo.find({
      where: { restaurant_id: restaurantId, is_deleted: false },
      order: { created_at: 'DESC' }
    });

    // Set cache (TTL is globally set in cache config or can be overridden here)
    await this.cacheManager.set(cacheKey, menuItems, 60000); // 60s
    return menuItems;
  }

  async updateMenuItem(
    restaurantId: string,
    itemId: string,
    updateMenuItemDto: UpdateMenuItemDto,
  ): Promise<MenuItem> {
    const menuItem = await this.menuItemRepo.findOne({
      where: { id: itemId, restaurant_id: restaurantId, is_deleted: false },
    });

    if (!menuItem) {
      throw new NotFoundException(`MenuItem with ID ${itemId} not found in Restaurant ${restaurantId}`);
    }

    Object.assign(menuItem, updateMenuItemDto);
    const updatedItem = await this.menuItemRepo.save(menuItem);

    // Invalidate cache
    await this.cacheManager.del(`restaurant:${restaurantId}:menu`);
    return updatedItem;
  }

  async removeMenuItem(restaurantId: string, itemId: string): Promise<void> {
    const menuItem = await this.menuItemRepo.findOne({
      where: { id: itemId, restaurant_id: restaurantId, is_deleted: false },
    });

    if (!menuItem) {
      throw new NotFoundException(`MenuItem with ID ${itemId} not found in Restaurant ${restaurantId}`);
    }

    menuItem.is_deleted = true;
    await this.menuItemRepo.save(menuItem);

    // Invalidate cache
    await this.cacheManager.del(`restaurant:${restaurantId}:menu`);
  }
}
