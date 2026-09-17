import { Injectable, Inject } from '@nestjs/common';
import { ElasticsearchRepository } from '@/modules/search/repositories/elasticsearch.repository.js';

@Injectable()
export class SyncRestaurantIndexUseCase {
  constructor(
    @Inject(ElasticsearchRepository)
    private readonly elasticsearchRepo: ElasticsearchRepository
  ) {}

  async indexRestaurant(restaurant: any) {
    return this.elasticsearchRepo.indexRestaurant(restaurant);
  }

  async removeRestaurant(id: string) {
    return this.elasticsearchRepo.removeRestaurant(id);
  }
}
