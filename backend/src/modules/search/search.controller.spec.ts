import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '@/modules/search/search.controller.js';
import { SearchReadRepository } from '@/modules/search/repositories/search.read.repository.js';
import { GetCategoriesUseCase } from '@/modules/search/usecases/get-categories.usecase.js';
import { GetTagsUseCase } from '@/modules/search/usecases/get-tags.usecase.js';
import { SearchRestaurantsUseCase } from '@/modules/search/usecases/search-restaurants.usecase.js';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';
import { GetRestaurantsUseCase } from '@/modules/restaurants/usecases/get-restaurants.usecase.js';
import { SyncRestaurantIndexUseCase } from '@/modules/search/usecases/sync-restaurant-index.usecase.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SearchController', () => {
  let controller: SearchController;
  let getCategoriesUseCase: GetCategoriesUseCase;
  let searchRestaurantsUseCase: SearchRestaurantsUseCase;

  beforeEach(async () => {
    const mockSearchReadRepository = {
      getFreeshipDistanceThreshold: vi.fn().mockResolvedValue(5),
    };
    const mockGetCategoriesUseCase = {
      execute: vi.fn().mockResolvedValue(['Bún Bò', 'Phở']),
    };
    const mockGetTagsUseCase = {
      execute: vi.fn().mockResolvedValue([]),
    };
    const mockSearchRestaurantsUseCase = {
      execute: vi.fn().mockResolvedValue([
        { id: '1', name: 'Nhà hàng Test' }
      ]),
    };
    const mockSearchMenuUseCase = {
      execute: vi.fn().mockResolvedValue([]),
    };
    const mockGetRestaurantsUseCase = {
      execute: vi.fn().mockResolvedValue([]),
    };
    const mockSyncRestaurantIndexUseCase = {
      indexRestaurant: vi.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        { provide: SearchReadRepository, useValue: mockSearchReadRepository },
        { provide: GetCategoriesUseCase, useValue: mockGetCategoriesUseCase },
        { provide: GetTagsUseCase, useValue: mockGetTagsUseCase },
        { provide: SearchRestaurantsUseCase, useValue: mockSearchRestaurantsUseCase },
        { provide: SearchMenuUseCase, useValue: mockSearchMenuUseCase },
        { provide: GetRestaurantsUseCase, useValue: mockGetRestaurantsUseCase },
        { provide: SyncRestaurantIndexUseCase, useValue: mockSyncRestaurantIndexUseCase },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    getCategoriesUseCase = module.get<GetCategoriesUseCase>(GetCategoriesUseCase);
    searchRestaurantsUseCase = module.get<SearchRestaurantsUseCase>(SearchRestaurantsUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return categories', async () => {
    const result = await controller.getCategories();
    expect(result).toEqual(['Bún Bò', 'Phở']);
    expect(getCategoriesUseCase.execute).toHaveBeenCalled();
  });

  it('should search restaurants with default lat and lon', async () => {
    const q = 'Bún';
    const result = await controller.searchRestaurants(q);
    
    expect(result).toEqual([{ id: '1', name: 'Nhà hàng Test' }]);
    expect(searchRestaurantsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'Bún',
        lat: 10.762622, // Default lat in controller
        lon: 106.660172, // Default lon in controller
      })
    );
  });
});
