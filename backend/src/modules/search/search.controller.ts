import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from '@/modules/search/search.service.js';
import { DataSource } from 'typeorm';
import { Config } from '@/modules/restaurants/entities/config.entity.js';

@Controller('api/search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly dataSource: DataSource,
  ) {}

  @Get('restaurants')
  async searchRestaurants(
    @Query('q') q?: string,
    @Query('lat') lat?: number,
    @Query('lon') lon?: number,
    @Query('radius') radius?: string,
    @Query('rating') rating?: number,
    @Query('categories') categories?: string,
    @Query('tags') tags?: string,
    @Query('freeship') freeship?: string, // received as string from query
  ) {
    // Mock user lat/lon if not provided, per user request
    const userLat = lat ? Number(lat) : 10.762622;
    const userLon = lon ? Number(lon) : 106.660172;

    let freeshipDistanceThreshold = 2; // default 2km
    try {
      const configRepo = this.dataSource.getRepository(Config);
      const config = await configRepo.findOne({ where: { key: 'freeship_distance_threshold' } });
      if (config && config.value) {
        freeshipDistanceThreshold = Number(config.value);
      }
    } catch (e) {
      console.warn('Could not fetch freeship config, using default 2km', e);
    }

    const categoriesArray = categories ? categories.split(',') : undefined;
    const tagsArray = tags ? tags.split(',') : undefined;

    return this.searchService.searchRestaurants({
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
