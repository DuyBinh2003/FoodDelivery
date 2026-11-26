import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ValidationPipe,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SearchMenuUseCase } from '@/modules/search/usecases/search-menu.usecase.js';
import {
  SearchRestaurantsUseCase,
  type SearchRestaurantsQuery,
} from '@/modules/search/usecases/search-restaurants.usecase.js';
import { SuggestSearchUseCase } from '@/modules/search/usecases/suggest-search.usecase.js';
import { GetCategoriesUseCase } from '@/modules/search/usecases/get-categories.usecase.js';
import { GetTagsUseCase } from '@/modules/search/usecases/get-tags.usecase.js';
import { SyncRestaurantIndexUseCase } from '@/modules/search/usecases/sync-restaurant-index.usecase.js';
import { ElasticsearchRepository } from '@/modules/search/repositories/elasticsearch.repository.js';
import { SuggestSearchDto, SearchRestaurantsDto } from '@/modules/search/dto/search-query.dto.js';
import {
  UpdateMenuItemProjectionDto,
  UpdateRestaurantProjectionDto,
} from '@/modules/search/dto/projection.dto.js';
import { CircuitBreaker } from '@/common/resilience/circuit-breaker.js';

@Controller('search')
export class SearchController {
  private readonly searchBreaker = new CircuitBreaker({
    name: 'SearchCatalogBreaker',
    failureThreshold: 5,
    resetTimeoutMs: 15000,
    halfOpenSuccessThreshold: 2,
  });

  private readonly paginatedMenuBreaker = new CircuitBreaker({
    name: 'PaginatedMenuCatalogBreaker',
    failureThreshold: 5,
    resetTimeoutMs: 15000,
    halfOpenSuccessThreshold: 2,
  });

  constructor(
    private readonly searchMenuUseCase: SearchMenuUseCase,
    private readonly searchRestaurantsUseCase: SearchRestaurantsUseCase,
    private readonly suggestSearchUseCase: SuggestSearchUseCase,
    private readonly getCategoriesUseCase: GetCategoriesUseCase,
    private readonly getTagsUseCase: GetTagsUseCase,
    private readonly syncRestaurantIndexUseCase: SyncRestaurantIndexUseCase,
    private readonly elasticsearchRepo: ElasticsearchRepository,
  ) {}

  private normalizeSearchQuery(dto: SearchRestaurantsDto): SearchRestaurantsQuery {
    const mergedCategories = Array.from(
      new Set([...(dto.categories ?? []), ...(dto.category ? [dto.category] : [])].filter(Boolean)),
    );
    const mergedTags = Array.from(
      new Set([...(dto.tags ?? []), ...(dto.tag ? [dto.tag] : [])].filter(Boolean)),
    );

    return {
      q: dto.q,
      lat: dto.lat,
      lon: dto.lon,
      radius: dto.radius,
      rating: dto.rating,
      categories: mergedCategories.length > 0 ? mergedCategories : undefined,
      tags: mergedTags.length > 0 ? mergedTags : undefined,
      freeship: dto.freeship,
      freeshipDistanceThreshold: dto.freeshipDistanceThreshold,
      open_only: dto.open_only,
      sort_by: dto.sort_by,
      promo: dto.promo,
      page: dto.page,
      limit: dto.limit,
    };
  }

  @Post('sync')
  syncRestaurants() {
    return this.syncRestaurantIndexUseCase.syncAll();
  }

  @Get('suggestions')
  getSuggestions(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: SuggestSearchDto,
  ) {
    return this.suggestSearchUseCase.execute(query);
  }

  @Get('menu')
  searchMenu(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: SearchRestaurantsDto,
  ) {
    const normalized = this.normalizeSearchQuery(query);
    return this.searchBreaker.execute(
      () => this.searchMenuUseCase.execute(normalized),
      () => ({
        items: [
          {
            id: 'fb-1',
            name: 'Phở Bò Tái Nạm (Món Thịnh Hành)',
            price: 55000,
            restaurant_name: 'Phở Gia Truyền',
            is_available: true,
            rating: 4.8,
          },
          {
            id: 'fb-2',
            name: 'Cơm Tấm Sườn Bì Chả',
            price: 60000,
            restaurant_name: 'Cơm Tấm Ba Ghiền',
            is_available: true,
            rating: 4.9,
          },
          {
            id: 'fb-3',
            name: 'Trà Sữa Trân Châu Đường Đen',
            price: 35000,
            restaurant_name: 'Gong Cha',
            is_available: true,
            rating: 4.7,
          },
        ],
        total: 3,
        isFallback: true,
        circuitStatus: 'OPEN',
        message:
          'Hệ thống tìm kiếm tức thời đang được tối ưu. Đang gợi ý các món ăn & quán ngon phổ biến gần bạn.',
      }),
    );
  }

  @Get('menu/paginated')
  searchMenuPaginated(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: SearchRestaurantsDto,
  ) {
    const normalized = this.normalizeSearchQuery(query);
    const page = Math.max(1, Math.floor(Number(normalized.page) || 1));
    const limit = Math.min(30, Math.max(1, Math.floor(Number(normalized.limit) || 8)));

    return this.paginatedMenuBreaker.execute(
      () => this.searchMenuUseCase.executePaginated({ ...normalized, page, limit }),
      () => ({
        sections: [],
        pagination: {
          page,
          limit,
          totalRestaurants: 0,
          totalDishes: 0,
          totalPages: 0,
          hasMore: false,
        },
        isFallback: true,
        circuitStatus: 'OPEN',
        message:
          'Hệ thống tìm kiếm tức thời đang tạm thời gián đoạn. Vui lòng thử kết nối lại sau ít giây.',
      }),
    );
  }

  @Get('restaurants')
  searchRestaurants(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: SearchRestaurantsDto,
  ) {
    const normalized = this.normalizeSearchQuery(query);
    return this.searchBreaker.execute(
      () => this.searchRestaurantsUseCase.execute(normalized),
      () => ({
        items: [
          {
            id: 'fb-rest-1',
            name: 'Phở Gia Truyền Hà Nội',
            rating: 4.9,
            is_active: true,
            address: 'Quận 1, TP.HCM',
          },
          {
            id: 'fb-rest-2',
            name: 'Cơm Tấm Sài Gòn',
            rating: 4.8,
            is_active: true,
            address: 'Bình Thạnh, TP.HCM',
          },
        ],
        total: 2,
        isFallback: true,
        circuitStatus: 'OPEN',
        message:
          'Hệ thống tìm kiếm tức thời đang được tối ưu. Đang gợi ý các quán ăn phổ biến gần bạn.',
      }),
    );
  }

  @Get('discover/restaurants')
  async discoverRestaurants(
    @Query(new ValidationPipe({ transform: true })) query: Record<string, string>,
  ) {
    const rawUrl = process.env.RESTAURANT_SERVICE_URL?.trim();
    if (!rawUrl) {
      throw new ServiceUnavailableException(
        '[ConfigError] RESTAURANT_SERVICE_URL environment variable is required.',
      );
    }
    const q = new URLSearchParams(query).toString();
    const res = await fetch(`${rawUrl.replace(/\/+$/, '')}/restaurants?${q}`);
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
  async updateRestaurantRating(@Param('id') id: string, @Body() dto: { rating: number }) {
    await this.elasticsearchRepo.updateRestaurantRating(id, dto.rating);
    return { success: true, id, rating: dto.rating };
  }

  @Patch('internal/search/projection/menu-items/:id')
  async updateMenuItemProjection(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemProjectionDto,
  ) {
    await this.elasticsearchRepo.updateMenuItemProjection(id, dto);
    return { success: true, id, updated: dto };
  }

  @Patch('internal/search/projection/restaurants/:id')
  async updateRestaurantProjection(
    @Param('id') id: string,
    @Body() dto: UpdateRestaurantProjectionDto,
  ) {
    await this.elasticsearchRepo.updateRestaurantProjection(id, dto);
    return { success: true, id, updated: dto };
  }
}
