import { Injectable, Inject } from '@nestjs/common';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';

@Injectable()
export class GetCategoriesUseCase {
  constructor(
    @Inject(RestaurantReadRepository)
    private readonly restaurantReadRepo: RestaurantReadRepository,
  ) {}

  async execute(): Promise<Category[]> {
    return this.restaurantReadRepo.findAllCategories();
  }
}
