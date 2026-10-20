import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';

@Injectable()
export class RestaurantReadRepository {
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

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantRepo.find({ 
      where: { is_deleted: false },
      relations: { categories: true }
    });
  }

  async findById(id: string): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({
      where: { id, is_deleted: false },
      relations: { categories: true },
    });
  }

  async findByOwnerId(ownerId: string): Promise<Restaurant | null> {
    return this.restaurantRepo.findOne({
      where: { owner_id: ownerId, is_deleted: false },
      relations: { categories: true },
    });
  }

  async findMenuItems(restaurantId: string): Promise<MenuItem[]> {
    return this.menuItemRepo.find({
      where: { restaurant_id: restaurantId, is_deleted: false },
      relations: { tags: true, category: true },
      order: { created_at: 'DESC' }
    });
  }

  async findMenuItemById(itemId: string, restaurantId: string): Promise<MenuItem | null> {
    return this.menuItemRepo.findOne({
      where: { id: itemId, restaurant_id: restaurantId, is_deleted: false },
      relations: { tags: true, category: true },
    });
  }

  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      where: { is_deleted: false },
      order: { name: 'ASC' },
    });
  }

  async findAllTags(): Promise<Tag[]> {
    return this.tagRepo.find({
      where: { is_deleted: false },
      order: { name: 'ASC' },
    });
  }

  async findTagByName(name: string): Promise<Tag | null> {
    return this.tagRepo
      .createQueryBuilder('tag')
      .where('LOWER(TRIM(tag.name)) = LOWER(TRIM(:name))', { name })
      .andWhere('tag.is_deleted = false')
      .getOne();
  }
}
