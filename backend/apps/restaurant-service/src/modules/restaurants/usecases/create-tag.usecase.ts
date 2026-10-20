import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { CreateTagDto } from '@/modules/restaurants/dto/create-tag.dto.js';

@Injectable()
export class CreateTagUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
    @Inject(RestaurantWriteRepository)
    private readonly restaurantWriteRepo: RestaurantWriteRepository,
  ) {}

  async execute(dto: CreateTagDto): Promise<Tag> {
    const trimmedName = dto.name?.trim();
    if (!trimmedName) {
      throw new BadRequestException('Tên tag không được để trống');
    }

    // Check if tag already exists (case-insensitive)
    const existing = await this.restaurantReadRepo.findTagByName(trimmedName);
    if (existing) {
      return existing;
    }

    return this.restaurantWriteRepo.createTag(trimmedName);
  }
}
