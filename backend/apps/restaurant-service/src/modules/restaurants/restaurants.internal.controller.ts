import { Controller, Get, Post, Patch, Param, Query, Body, NotFoundException, Inject, ParseUUIDPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { Config } from '@/modules/restaurants/entities/config.entity.js';
import { CheckOperatingStatusUseCase } from '@/modules/restaurants/usecases/check-operating-status.usecase.js';

@Controller('internal')
export class RestaurantsInternalController {
  constructor(
    @InjectRepository(Restaurant) private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(MenuItem) private readonly menuRepo: Repository<MenuItem>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    @InjectRepository(Config) private readonly configRepo: Repository<Config>,
    @Inject(CheckOperatingStatusUseCase) private readonly checkOperatingStatusUseCase: CheckOperatingStatusUseCase,
  ) {}

  @Get('restaurants/:id/operating-status')
  async getOperatingStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.checkOperatingStatusUseCase.execute(id);
  }

  @Get('restaurants/metrics')
  async getMetrics(): Promise<{ totalRestaurants: number }> {
    return {
      totalRestaurants: await this.restaurantRepo.count(),
    };
  }

  @Get('restaurants/admin-list')
  async getRestaurantsAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));

    const qb = this.restaurantRepo
      .createQueryBuilder('r')
      .where('r.is_deleted = false');

    if (search) {
      qb.andWhere('(r.name ILIKE :search OR r.address ILIKE :search)', { search: `%${search}%` });
    }

    if (status === 'ACTIVE') {
      qb.andWhere('r.is_active = true');
    } else if (status === 'INACTIVE') {
      qb.andWhere('r.is_active = false');
    }

    const [data, total] = await qb
      .orderBy('r.created_at', 'DESC')
      .skip((p - 1) * l)
      .take(l)
      .getManyAndCount();

    return {
      data,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
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
    @Query('categories') categories?: string,
  ): Promise<MenuItem[]> {
    if (!restaurantIds) return [];
    const ids = restaurantIds.split(',').map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return [];

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const qb = this.menuRepo
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.tags', 'tag')
      .leftJoinAndSelect('item.category', 'cat')
      .where('item.restaurant_id IN (:...ids)', { ids })
      .andWhere('item.is_deleted = false')
      .andWhere('item.is_available = true');

    if (q) {
      qb.andWhere('item.name ILIKE :q', { q: `%${q}%` });
    }

    if (categories) {
      const catList = categories.split(',').map((c) => c.trim()).filter(Boolean);
      const catUuids = catList.filter((c) => uuidRegex.test(c));
      const catNames = catList.filter((c) => !uuidRegex.test(c)).map((c) => c.toLowerCase());
      if (catUuids.length > 0 && catNames.length > 0) {
        qb.andWhere('(item.category_id IN (:...catUuids) OR LOWER(cat.name) IN (:...catNames))', {
          catUuids,
          catNames,
        });
      } else if (catUuids.length > 0) {
        qb.andWhere('item.category_id IN (:...catUuids)', { catUuids });
      } else if (catNames.length > 0) {
        qb.andWhere('LOWER(cat.name) IN (:...catNames)', { catNames });
      }
    }

    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const tagUuids = tagList.filter((t) => uuidRegex.test(t));
      const tagNames = tagList.filter((t) => !uuidRegex.test(t));
      if (tagUuids.length > 0 && tagNames.length > 0) {
        qb.andWhere('(tag.id IN (:...tagUuids) OR tag.name IN (:...tagNames))', {
          tagUuids,
          tagNames,
        });
      } else if (tagUuids.length > 0) {
        qb.andWhere('tag.id IN (:...tagUuids)', { tagUuids });
      } else if (tagNames.length > 0) {
        qb.andWhere('tag.name IN (:...tagNames)', { tagNames });
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

  @Get('restaurants/:id/status')
  async getRestaurantStatus(
    @Param('id') id: string,
  ): Promise<{ id: string; name: string; is_active: boolean; verification_status: string }> {
    const restaurant = await this.restaurantRepo.findOne({ where: { id, is_deleted: false } });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return {
      id: restaurant.id,
      name: restaurant.name,
      is_active: restaurant.is_active,
      verification_status: restaurant.verification_status,
    };
  }

  @Get('restaurants/by-owner/:ownerId')
  async getRestaurantByOwner(
    @Param('ownerId') ownerId: string,
  ): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({
      where: { owner_id: ownerId, is_deleted: false },
    });
  }

  @Get('restaurants/:id/details')
  async getRestaurantDetails(
    @Param('id') id: string,
  ): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({
      where: { id, is_deleted: false },
    });
  }

  @Post('restaurants/from-registration')
  async createFromRegistration(
    @Body() body: { owner_id: string; name: string; address?: string },
  ): Promise<Restaurant> {
    const restaurant = this.restaurantRepo.create({
      owner_id: body.owner_id,
      name: body.name,
      address: body.address || '',
      is_active: true,
      verification_status: 'APPROVED',
      rating: 5,
    });
    return this.restaurantRepo.save(restaurant);
  }

  @Patch('restaurants/:id/rating')
  async updateRestaurantRating(
    @Param('id') id: string,
    @Body() dto: { rating: number },
  ): Promise<{ success: boolean; id: string; rating: number }> {
    const restaurant = await this.restaurantRepo.findOne({
      where: { id, is_deleted: false },
    });
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }

    restaurant.rating = Number(dto.rating) || 0;
    await this.restaurantRepo.save(restaurant);
    return { success: true, id, rating: Number(restaurant.rating) };
  }
}

