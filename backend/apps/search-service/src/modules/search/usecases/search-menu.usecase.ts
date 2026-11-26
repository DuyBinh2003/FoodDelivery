import { Injectable, Inject, Logger } from '@nestjs/common';
import { SearchRestaurantsQuery } from '@/modules/search/usecases/search-restaurants.usecase.js';
import {
  ElasticsearchRepository,
  calculateHaversineKm,
  type MenuItemDocument,
  type RestaurantDocument,
} from '@/modules/search/repositories/elasticsearch.repository.js';
import {
  SearchReadRepository,
  type MenuItemData,
} from '@/modules/search/repositories/search.read.repository.js';

export interface MenuItemWithRestaurant extends Partial<MenuItemData> {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  original_price?: number;
  options?: MenuItemData['options'];
  category_id?: string;
  category?: { id: string; name: string };
  is_available: boolean;
  tags?: Array<{ id: string; name: string }>;
}

export interface MenuSectionResult {
  restaurant: string;
  restaurant_id?: string;
  restaurant_banner_url?: string;
  restaurant_rating?: number;
  restaurant_total_reviews?: number;
  restaurant_address?: string;
  distance_km?: number;
  items: MenuItemWithRestaurant[];
}

export interface PaginatedMenuResult {
  sections: MenuSectionResult[];
  pagination: {
    page: number;
    limit: number;
    totalRestaurants: number;
    totalDishes: number;
    totalPages: number;
    hasMore: boolean;
  };
  isFallback: boolean;
  circuitStatus: 'CLOSED' | 'DEGRADED' | 'OPEN';
  message?: string;
}

@Injectable()
export class SearchMenuUseCase {
  private readonly logger = new Logger(SearchMenuUseCase.name);

  constructor(
    @Inject(ElasticsearchRepository)
    private readonly elasticsearchRepo: ElasticsearchRepository,
    @Inject(SearchReadRepository)
    private readonly searchReadRepo: SearchReadRepository,
  ) {}

  async execute(query: SearchRestaurantsQuery): Promise<MenuSectionResult[]> {
    try {
      const esMenuItems = await this.elasticsearchRepo.searchMenuItems(query);
      if (esMenuItems && esMenuItems.length > 0) {
        return this.groupMenuItemsByRestaurant(esMenuItems, new Map(), query.lat, query.lon);
      }
    } catch (esError: unknown) {
      this.logger.warn(
        'Direct Elasticsearch menu query failed or empty, falling back to read repository:',
        esError,
      );
    }

    const restaurants = await this.elasticsearchRepo.searchRestaurants(query);
    if (!restaurants || restaurants.length === 0) {
      return [];
    }

    const restaurantIds = restaurants.map((r) => r.id);
    const menuItems = await this.searchReadRepo.getMenuItemsForRestaurants(restaurantIds, {
      q: query.q,
      tags: query.tags,
      categories: query.categories,
    });

    return this.mapSqlRestaurantsAndItems(restaurants, menuItems, query.lat, query.lon);
  }

  async executePaginated(query: SearchRestaurantsQuery): Promise<PaginatedMenuResult> {
    const page = Math.max(1, Math.floor(Number(query.page) || 1));
    const limit = Math.min(30, Math.max(1, Math.floor(Number(query.limit) || 8)));

    try {
      const esResult = await this.elasticsearchRepo.searchMenuItemsPaginated({
        ...query,
        page,
        limit,
      });

      const sections = this.groupMenuItemsByRestaurant(
        esResult.items,
        esResult.restaurantsById,
        query.lat,
        query.lon,
        esResult.pageRestaurantIds,
      );

      return {
        sections,
        pagination: esResult.pagination,
        isFallback: false,
        circuitStatus: 'CLOSED',
      };
    } catch (esError: unknown) {
      this.logger.warn(
        'Paginated Elasticsearch menu search failed, activating SQL fallback:',
        esError,
      );
    }

    const categoryId =
      query.categories && query.categories.length > 0 ? query.categories[0] : undefined;
    const fallbackRestPage = await this.searchReadRepo.getPaginatedRestaurantsFallback({
      page,
      limit,
      categoryId,
      q: query.q,
      promoOnly: query.promo === 'discount' || query.promo === 'true',
    });

    if (!fallbackRestPage.items || fallbackRestPage.items.length === 0) {
      return {
        sections: [],
        pagination: {
          page,
          limit,
          totalRestaurants: fallbackRestPage.pagination.total,
          totalDishes: 0,
          totalPages: fallbackRestPage.pagination.totalPages,
          hasMore: fallbackRestPage.pagination.hasMore,
        },
        isFallback: true,
        circuitStatus: 'DEGRADED',
        message: 'Đang hiển thị dữ liệu trực tiếp từ cơ sở dữ liệu dự phòng.',
      };
    }

    const restaurantIds = fallbackRestPage.items.map((r) => r.id);
    const menuItems = await this.searchReadRepo.getMenuItemsForRestaurants(restaurantIds, {
      q: query.q,
      tags: query.tags,
      categories: query.categories,
    });

    const restDocs: RestaurantDocument[] = fallbackRestPage.items.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      banner_url: r.banner_url,
      rating: r.rating !== undefined ? Number(r.rating) : 0,
      location:
        r.lat !== undefined && r.lon !== undefined
          ? { lat: Number(r.lat), lon: Number(r.lon) }
          : undefined,
    }));

    const sections = this.mapSqlRestaurantsAndItems(restDocs, menuItems, query.lat, query.lon);
    const totalDishesLoaded = sections.reduce((sum, sec) => sum + sec.items.length, 0);

    return {
      sections,
      pagination: {
        page,
        limit,
        totalRestaurants: fallbackRestPage.pagination.total,
        totalDishes: Math.max(totalDishesLoaded, fallbackRestPage.pagination.total),
        totalPages: fallbackRestPage.pagination.totalPages,
        hasMore: fallbackRestPage.pagination.hasMore,
      },
      isFallback: true,
      circuitStatus: 'DEGRADED',
      message: 'Đang hiển thị dữ liệu trực tiếp từ cơ sở dữ liệu dự phòng.',
    };
  }

  private mapSqlRestaurantsAndItems(
    restaurants: RestaurantDocument[],
    menuItems: MenuItemData[],
    userLat?: number,
    userLon?: number,
  ): MenuSectionResult[] {
    return restaurants
      .map((restaurant): MenuSectionResult => {
        const itemsForRestaurant = menuItems.filter((item) => item.restaurant_id === restaurant.id);
        let distanceKm: number | undefined;
        if (userLat !== undefined && userLon !== undefined && restaurant.location) {
          distanceKm = calculateHaversineKm(
            userLat,
            userLon,
            restaurant.location.lat,
            restaurant.location.lon,
          );
        }

        return {
          restaurant: restaurant.name,
          restaurant_id: restaurant.id,
          restaurant_banner_url: restaurant.banner_url,
          restaurant_rating: restaurant.rating ?? 0,
          restaurant_total_reviews: restaurant.total_reviews ?? 0,
          restaurant_address: restaurant.address,
          distance_km: distanceKm,
          items: itemsForRestaurant.map((item) => ({
            id: item.id,
            restaurant_id: item.restaurant_id,
            restaurant_name: restaurant.name,
            name: item.name,
            description: item.description,
            image_url: item.image_url,
            price: Number(item.price) || 0,
            original_price:
              item.original_price !== null && item.original_price !== undefined
                ? Number(item.original_price)
                : undefined,
            options: Array.isArray(item.options) ? item.options : [],
            category_id: item.category_id ?? item.category?.id,
            category: item.category,
            is_available: item.is_available,
            tags: Array.isArray(item.tags) ? item.tags : [],
          })),
        };
      })
      .filter((r) => r.items.length > 0);
  }

  private groupMenuItemsByRestaurant(
    menuItems: MenuItemDocument[],
    restaurantsById: Map<string, RestaurantDocument>,
    userLat?: number,
    userLon?: number,
    orderedRestaurantIds?: string[],
  ): MenuSectionResult[] {
    const map = new Map<string, MenuSectionResult>();

    if (orderedRestaurantIds) {
      for (const restId of orderedRestaurantIds) {
        const restDoc = restaurantsById.get(restId);
        if (restDoc) {
          let distanceKm: number | undefined;
          if (userLat !== undefined && userLon !== undefined && restDoc.location) {
            distanceKm = calculateHaversineKm(
              userLat,
              userLon,
              restDoc.location.lat,
              restDoc.location.lon,
            );
          }
          map.set(restId, {
            restaurant: restDoc.name,
            restaurant_id: restId,
            restaurant_banner_url: restDoc.banner_url,
            restaurant_rating: restDoc.rating ?? 0,
            restaurant_total_reviews: restDoc.total_reviews ?? 0,
            restaurant_address: restDoc.address,
            distance_km: distanceKm,
            items: [],
          });
        }
      }
    }

    for (const item of menuItems) {
      const restKey = item.restaurant_id || item.restaurant_name || 'Nhà hàng';
      const restDoc = item.restaurant_id ? restaurantsById.get(item.restaurant_id) : undefined;
      let section = map.get(restKey);

      if (!section) {
        const restLocation = restDoc?.location ?? item.location;
        let distanceKm: number | undefined;
        if (userLat !== undefined && userLon !== undefined && restLocation) {
          distanceKm = calculateHaversineKm(userLat, userLon, restLocation.lat, restLocation.lon);
        }

        section = {
          restaurant: restDoc?.name ?? item.restaurant_name ?? 'Nhà hàng',
          restaurant_id: item.restaurant_id,
          restaurant_banner_url: restDoc?.banner_url ?? item.restaurant_banner_url,
          restaurant_rating: restDoc?.rating ?? item.rating ?? 0,
          restaurant_total_reviews:
            restDoc?.total_reviews ?? item.restaurant_total_reviews ?? 0,
          restaurant_address: restDoc?.address ?? item.restaurant_address,
          distance_km: distanceKm,
          items: [],
        };
        map.set(restKey, section);
      }

      const normalizedTags: Array<{ id: string; name: string }> = Array.isArray(item.tags)
        ? item.tags.map((tagName, idx) => ({
            id: item.tag_ids?.[idx] || tagName,
            name: tagName,
          }))
        : [];

      section.items.push({
        id: item.id,
        restaurant_id: item.restaurant_id,
        restaurant_name: section.restaurant,
        name: item.name,
        description: item.description,
        image_url: item.image_url,
        price: Number(item.price) || 0,
        original_price:
          item.original_price !== null && item.original_price !== undefined
            ? Number(item.original_price)
            : undefined,
        options: Array.isArray(item.options) ? item.options : [],
        category_id: item.category_id,
        category:
          item.category_id || item.category_name
            ? {
                id: item.category_id ?? item.category_name ?? '',
                name: item.category_name ?? '',
              }
            : undefined,
        is_available: item.is_available,
        tags: normalizedTags,
      });
    }

    return Array.from(map.values()).filter((section) => section.items.length > 0);
  }
}
