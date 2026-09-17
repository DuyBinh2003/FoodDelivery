import { Injectable, Inject } from '@nestjs/common';
import { ElasticsearchRepository } from '@/modules/search/repositories/elasticsearch.repository.js';

export interface SearchRestaurantsQuery {
  q?: string;
  lat?: number;
  lon?: number;
  radius?: string;
  rating?: number;
  categories?: string[];
  tags?: string[];
  freeship?: boolean;
  freeshipDistanceThreshold?: number;
}

@Injectable()
export class SearchRestaurantsUseCase {
  constructor(
    @Inject(ElasticsearchRepository)
    private readonly elasticsearchRepo: ElasticsearchRepository
  ) {}

  async execute(query: SearchRestaurantsQuery) {
    return this.elasticsearchRepo.searchRestaurants(query);
  }
}
