import { Controller, Get, Post, Patch, Param, Body, Query, ValidationPipe } from '@nestjs/common';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';
import { SearchRestaurantsUseCase } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { GetCategoriesUseCase } from '@/modules/search/usecases/get-categories.usecase.js';
import { GetTagsUseCase } from '@/modules/search/usecases/get-tags.usecase.js';
import { SyncRestaurantIndexUseCase } from '@/modules/search/usecases/sync-restaurant-index.usecase.js';
import { ElasticsearchRepository } from '@/modules/search/repositories/elasticsearch.repository.js';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchMenuUseCase: SearchMenuUseCase,
    private readonly searchRestaurantsUseCase: SearchRestaurantsUseCase,
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly getTagsUseCase: GetTagsUseCase,
    private readonly syncRestaurantIndexUseCase: SyncRestaurantIndexUseCase,
    private readonly elasticsearchRepo: ElasticsearchRepository,
  ) {}

  @Post('sync')
  syncRestaurants() {
    return this.syncRestaurantIndexUseCase.syncAll();
  }

  @Get('menu')
  searchMenu(@Query(new ValidationPipe({ transform: true })) query: any) {
    return this.searchMenuUseCase.execute(query);
  }

  @Get('restaurants')
  searchRestaurants(@Query(new ValidationPipe({ transform: true })) query: any) {
    return this.searchRestaurantsUseCase.execute(query);
  }

  @Get('discover/restaurants')
  async discoverRestaurants(@Query(new ValidationPipe({ transform: true })) query: any) {
    const q = new URLSearchParams(query as any).toString();
    const url = process.env.RESTAURANT_SERVICE_URL!;
    const res = await fetch(`${url}/restaurants?${q}`);
    return res.json();
  }

  @Get('categories')
  getCategories() {
    return this.getCategoriesUseCase.execute();
  }

  @Get('tags')
  getTags() {
    return this.getTagsUseCase.execute();
  }

  @Patch('internal/restaurants/:id/rating')
  async updateRestaurantRating(
    @Param('id') id: string,
    @Body() dto: { rating: number },
  ) {
    await this.elasticsearchRepo.updateRestaurantRating(id, dto.rating);
    return { success: true, id, rating: dto.rating };
  }
}
