import { Injectable } from '@nestjs/common';
import { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';

@Injectable()
export class GetTagsUseCase {
  constructor(private readonly searchReadRepo: SearchReadRepository) {}

  async execute(): Promise<Tag[]> {
    return this.searchReadRepo.getTags();
  }
}
