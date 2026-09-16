import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SearchService } from '@/modules/search/search.service.js';
import { SearchController } from '@/modules/search/search.controller.js';
import { RestaurantSubscriber } from '@/modules/search/restaurant.subscriber.js';

@Module({
  imports: [
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        node: configService.get<string>('elasticsearch.node')!,
      }),
    }),
  ],
  providers: [SearchService, RestaurantSubscriber],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
