import { Injectable, Inject } from '@nestjs/common';
import { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';

@Injectable()
export class GetCategoriesUseCase {
  constructor(
    @Inject(SearchReadRepository)
    private readonly searchReadRepo: SearchReadRepository,
  ) {}

  async execute(): Promise<any[]> {
    return this.searchReadRepo.getCategories();
  }
}


