import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SearchService } from '@/modules/search/search.service.js';
import { SearchController } from '@/modules/search/search.controller.js';
import { RestaurantSubscriber } from '@/modules/search/restaurant.subscriber.js';

@Module({
  imports: [
    ElasticsearchModule.register({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    }),
  ],
  providers: [SearchService, RestaurantSubscriber],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
