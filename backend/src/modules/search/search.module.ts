import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SearchController } from '@/modules/search/search.controller.js';
import { RestaurantSubscriber } from '@/modules/search/restaurant.subscriber.js';
import { ElasticsearchRepository } from '@/modules/search/repositories/elasticsearch.repository.js';
import { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';
import { GetCategoriesUseCase } from '@/modules/search/usecases/get-categories.usecase.js';
import { GetTagsUseCase } from '@/modules/search/usecases/get-tags.usecase.js';
import { SearchRestaurantsUseCase } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';
import { SyncRestaurantIndexUseCase } from '@/modules/search/usecases/sync-restaurant-index.usecase.js';
import { RestaurantsModule } from '@/modules/restaurants/restaurants.module.js';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        node: configService.get<string>('elasticsearch.node')!,
      }),
    }),
    RestaurantsModule,
  ],
  providers: [
    RestaurantSubscriber,
    ElasticsearchRepository,
    SearchReadRepository,
    GetCategoriesUseCase,
    GetTagsUseCase,
    SearchRestaurantsUseCase,
    SearchMenuUseCase,
    SyncRestaurantIndexUseCase,
  ],
  controllers: [SearchController],
  exports: [
    ElasticsearchRepository,
    SearchReadRepository,
    GetCategoriesUseCase,
    GetTagsUseCase,
    SearchRestaurantsUseCase,
    SearchMenuUseCase,
    SyncRestaurantIndexUseCase,
  ],
})
export class SearchModule {}
