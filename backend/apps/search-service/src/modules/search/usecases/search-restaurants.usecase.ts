import { Injectable, Inject } from '@nestjs/common';
import {
  ElasticsearchRepository,
  RestaurantDocument,
} from '@/modules/search/repositories/elasticsearch.repository.js';

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
  open_only?: boolean;
  sort_by?: 'relevance' | 'distance' | 'rating';
}

@Injectable()
export class SearchRestaurantsUseCase {
  constructor(
    @Inject(ElasticsearchRepository)
    private readonly elasticsearchRepo: ElasticsearchRepository,
  ) {}

  async execute(query: SearchRestaurantsQuery): Promise<RestaurantDocument[]> {
    return this.elasticsearchRepo.searchRestaurants(query);
  }
}
