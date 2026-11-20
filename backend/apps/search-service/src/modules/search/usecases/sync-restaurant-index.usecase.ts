import { Injectable, Inject } from '@nestjs/common';
import {
  ElasticsearchRepository,
  RestaurantDocument,
} from '@/modules/search/repositories/elasticsearch.repository.js';

@Injectable()
export class SyncRestaurantIndexUseCase {
  constructor(
    @Inject(ElasticsearchRepository)
    private readonly elasticsearchRepo: ElasticsearchRepository,
  ) {}

  async indexRestaurant(restaurant: RestaurantDocument) {
    return this.elasticsearchRepo.indexRestaurant(restaurant);
  }

  async removeRestaurant(id: string) {
    return this.elasticsearchRepo.removeRestaurant(id);
  }

  async syncAll() {
    return this.elasticsearchRepo.syncAllRestaurants();
  }
}
