import { Controller, Get, Inject, Query } from '@nestjs/common';
import { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';
import { GetCategoriesUseCase } from '@/modules/search/usecases/get-categories.usecase.js';
import { GetTagsUseCase } from '@/modules/search/usecases/get-tags.usecase.js';
import { SearchRestaurantsUseCase } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';

@Controller('api/search')
export class SearchController {
  constructor(
    @Inject(SearchReadRepository)
    private readonly searchReadRepo: SearchReadRepository,
    @Inject(GetCategoriesUseCase)
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    @Inject(GetTagsUseCase)
    private readonly getTagsUseCase: GetTagsUseCase,
    @Inject(SearchRestaurantsUseCase)
    private readonly searchRestaurantsUseCase: SearchRestaurantsUseCase,
    @Inject(SearchMenuUseCase)
    private readonly searchMenuUseCase: SearchMenuUseCase,
  ) {}

  @Get('categories')
  async getCategories() {
    return this.getCategoriesUseCase.execute();
  }

  @Get('tags')
  async getTags() {
    return this.getTagsUseCase.execute();
  }

  @Get('restaurants')
  async searchRestaurants(
    @Query('q') q?: string,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
    @Query('radius') radius?: string,
    @Query('rating') rating?: number,
    @Query('categories') categories?: string,
    @Query('tags') tags?: string,
    @Query('freeship') freeship?: string,
  ) {
    const userLat = lat ? Number(lat) : 10.762622;
    const userLon = lon ? Number(lon) : 106.660172;

    const freeshipDistanceThreshold = await this.searchReadRepo.getFreeshipDistanceThreshold();

    const categoriesArray = categories ? categories.split(',') : undefined;
    const tagsArray = tags ? tags.split(',') : undefined;

    return this.searchRestaurantsUseCase.execute({
      q,
      lat: userLat,
      lon: userLon,
      radius,
      rating: rating ? Number(rating) : undefined,
      categories: categoriesArray,
      tags: tagsArray,
      freeship: freeship === 'true',
      freeshipDistanceThreshold
    });
  }

  @Get('menu')
  async searchMenu(
    @Query('q') q?: string,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
    @Query('radius') radius?: string,
    @Query('rating') rating?: number,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('freeship') freeship?: string,
  ) {
    const userLat = lat ? Number(lat) : 10.762622;
    const userLon = lon ? Number(lon) : 106.660172;

    const freeshipDistanceThreshold = await this.searchReadRepo.getFreeshipDistanceThreshold();

    const categoriesArray = category ? category.split(',') : undefined;
    const tagsArray = tag ? tag.split(',') : undefined;

    return this.searchMenuUseCase.execute({
      q,
      lat: userLat,
      lon: userLon,
      radius,
      rating: rating ? Number(rating) : undefined,
      categories: categoriesArray,
      tags: tagsArray,
      freeship: freeship === 'true',
      freeshipDistanceThreshold
    });
  }
}
