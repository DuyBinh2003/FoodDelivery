import { Injectable } from '@nestjs/common';
import { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';

@Injectable()
export class GetCategoriesUseCase {
  constructor(private readonly searchReadRepo: SearchReadRepository) {}

  async execute(): Promise<Category[]> {
    return this.searchReadRepo.getCategories();
  }
}
