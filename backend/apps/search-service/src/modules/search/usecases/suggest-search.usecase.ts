import { Injectable, Inject } from '@nestjs/common';
import {
  ElasticsearchRepository,
  SearchSuggestionsResult,
} from '@/modules/search/repositories/elasticsearch.repository.js';

export interface SuggestSearchQuery {
  q?: string;
  lat?: number;
  lon?: number;
}

@Injectable()
export class SuggestSearchUseCase {
  constructor(
    @Inject(ElasticsearchRepository)
    private readonly elasticsearchRepo: ElasticsearchRepository,
  ) {}

  async execute(query: SuggestSearchQuery): Promise<SearchSuggestionsResult> {
    if (!query.q || query.q.trim().length < 2) {
      return { keywords: [], dishes: [], restaurants: [] };
    }

    return this.elasticsearchRepo.getSuggestions(
      query.q,
      query.lat ? Number(query.lat) : undefined,
      query.lon ? Number(query.lon) : undefined,
    );
  }
}
