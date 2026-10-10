import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';
import { SearchRestaurantsUseCase } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { GetCategoriesUseCase } from '@/modules/search/usecases/get-categories.usecase.js';
import { GetTagsUseCase } from '@/modules/search/usecases/get-tags.usecase.js';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchMenuUseCase: SearchMenuUseCase,
    private readonly searchRestaurantsUseCase: SearchRestaurantsUseCase,
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly getTagsUseCase: GetTagsUseCase,
  ) {}

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
    const url = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';
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
}
