import { Injectable, Inject } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';

@Injectable()
export class GetTagsUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
  ) {}

  async execute(): Promise<Tag[]> {
    return this.restaurantReadRepo.findAllTags();
  }
}
