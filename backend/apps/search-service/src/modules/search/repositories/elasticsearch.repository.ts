import {
  Inject,
  Injectable,
  OnModuleInit,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import type { MenuItemOptionGroup } from '@/modules/search/repositories/search.read.repository.js';

type EsQueryParam = estypes.SearchRequest['query'];
type EsSortParam = estypes.SearchRequest['sort'];
type EsIndicesSettings = estypes.IndicesIndexSettings;
type EsMappingType = estypes.MappingTypeMapping;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CATEGORY_SLUG_ALIASES: Record<string, string[]> = {
  com: ['Cơm Tấm', 'Cơm'],
  'com-tam': ['Cơm Tấm'],
  'pho-bun': ['Phở', 'Bún Bò'],
  pho: ['Phở'],
  'bun-bo': ['Bún Bò'],
  'tra-sua': ['Trà Sữa'],
  'ga-ran': ['Gà Rán & Burger'],
  'ga-ran-burger': ['Gà Rán & Burger'],
  'banh-mi': ['Bánh Mì'],
  'pizza-mi-y': ['Pizza & Mì Ý'],
  'mon-chay': ['Món Chay'],
  'ca-phe': ['Cà Phê & Bánh'],
  'ca-phe-banh': ['Cà Phê & Bánh'],
  'an-vat': ['Giải khát', 'Trà Sữa'],
  'giai-khat': ['Giải khát'],
};

export interface RestaurantDocument {
  id: string;
  name: string;
  address?: string;
  banner_url?: string;
  location?: { lat: number; lon: number };
  rating?: number;
  total_reviews?: number;
  is_active?: boolean;
  categories?: string[];
  category_ids?: string[];
  tags?: string[];
  has_promo?: boolean;
  max_discount_percent?: number;
  suggest?: string[];
}

export interface MenuItemDocument {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_banner_url?: string;
  restaurant_address?: string;
  restaurant_total_reviews?: number;
  category_id?: string;
  category_name?: string;
  name: string;
  description?: string;
  image_url?: string;
  price: number;
  original_price?: number | null;
  options?: MenuItemOptionGroup[];
  is_available: boolean;
  tags?: string[];
  tag_ids?: string[];
  location?: { lat: number; lon: number };
  rating?: number;
  suggest?: string[];
}

export interface SearchRestaurantsParams {
  q?: string;
  lat?: number;
  lon?: number;
  radius?: string;
  rating?: number;
  categories?: string[];
  tags?: string[];
  freeship?: boolean;
  freeshipDistanceThreshold?: number;
  open_only?: boolean;
  sort_by?: 'relevance' | 'distance' | 'rating';
  promo?: 'freeship' | 'discount' | 'true';
  page?: number;
  limit?: number;
}

export interface PaginatedMenuItemsEsResult {
  items: MenuItemDocument[];
  pageRestaurantIds: string[];
  restaurantsById: Map<string, RestaurantDocument>;
  pagination: {
    page: number;
    limit: number;
    totalRestaurants: number;
    totalDishes: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface SearchSuggestionsResult {
  keywords: string[];
  dishes: Array<{
    id: string;
    name: string;
    price: number;
    restaurant_id: string;
    restaurant_name: string;
  }>;
  restaurants: Array<{
    id: string;
    name: string;
    rating: number;
    distance_km?: number;
  }>;
}

@Injectable()
export class ElasticsearchRepository implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchRepository.name);

  constructor(
    @Inject(ElasticsearchService) private readonly elasticsearchService: ElasticsearchService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.createIndices();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Elasticsearch initial index check failed: ${msg}. Retrying in 5s...`);
      setTimeout(() => {
        this.createIndices().catch((retryErr: unknown) => {
          this.logger.warn('Retry creating indices failed:', retryErr);
        });
      }, 5000);
    }

    setTimeout(() => {
      this.syncFromRestaurantServiceIfEmpty().catch((syncErr: unknown) => {
        this.logger.warn('Background sync from restaurant-service failed:', syncErr);
      });
    }, 5000);
  }

  async createIndices(): Promise<void> {
    const analysisSettings = {
      filter: {
        vietnamese_stop: {
          type: 'stop',
          stopwords: ['quán', 'tiệm', 'cửa hàng', 'và', 'ở'],
        },
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 20,
        },
      },
      analyzer: {
        vi_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'vietnamese_stop'],
        },
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'edge_ngram_filter'],
        },
      },
    };

    const restaurantIndex = 'restaurants';
    const restExists = await this.elasticsearchService.indices.exists({ index: restaurantIndex });
    if (restExists) {
      try {
        const settings = (await this.elasticsearchService.indices.getSettings({
          index: restaurantIndex,
        })) as unknown as Record<
          string,
          { settings?: { index?: { analysis?: { analyzer?: { vi_analyzer?: unknown } } } } }
        >;
        const hasViAnalyzer = Boolean(
          settings[restaurantIndex]?.settings?.index?.analysis?.analyzer?.vi_analyzer,
        );
        if (!hasViAnalyzer) {
          this.logger.log(`Upgrading index "${restaurantIndex}" to include vi_analyzer...`);
          await this.elasticsearchService.indices.delete({ index: restaurantIndex });
          await this.createRestaurantIndex(restaurantIndex, analysisSettings);
        }
      } catch (error: unknown) {
        this.logger.warn(`Could not verify settings of ${restaurantIndex}:`, error);
      }
    } else {
      await this.createRestaurantIndex(restaurantIndex, analysisSettings);
    }

    const menuIndex = 'menu_items';
    const menuExists = await this.elasticsearchService.indices.exists({ index: menuIndex });
    if (!menuExists) {
      await this.createMenuItemIndex(menuIndex, analysisSettings);
    }
  }

  private async createRestaurantIndex(
    indexName: string,
    analysisSettings: Record<string, unknown>,
  ): Promise<void> {
    await this.elasticsearchService.indices.create({
      index: indexName,
      settings: {
        analysis: analysisSettings,
      } as unknown as EsIndicesSettings,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
              keyword: { type: 'keyword' },
            },
          },
          address: { type: 'text', analyzer: 'vi_analyzer' },
          banner_url: { type: 'keyword', index: false },
          location: { type: 'geo_point' },
          rating: { type: 'float' },
          total_reviews: { type: 'integer' },
          is_active: { type: 'boolean' },
          categories: { type: 'keyword' },
          category_ids: { type: 'keyword' },
          tags: { type: 'keyword' },
          has_promo: { type: 'boolean' },
          max_discount_percent: { type: 'integer' },
          suggest: { type: 'completion' },
        },
      } as unknown as EsMappingType,
    });
    this.logger.log(`Index "${indexName}" created with Vietnamese analyzer & suggest mapping.`);
  }

  private async createMenuItemIndex(
    indexName: string,
    analysisSettings: Record<string, unknown>,
  ): Promise<void> {
    await this.elasticsearchService.indices.create({
      index: indexName,
      settings: {
        analysis: analysisSettings,
      } as unknown as EsIndicesSettings,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          restaurant_id: { type: 'keyword' },
          restaurant_name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          restaurant_banner_url: { type: 'keyword', index: false },
          restaurant_address: { type: 'text', analyzer: 'vi_analyzer' },
          restaurant_total_reviews: { type: 'integer' },
          category_id: { type: 'keyword' },
          category_name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              keyword: { type: 'keyword' },
            },
          },
          name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
              keyword: { type: 'keyword' },
            },
          },
          description: { type: 'text', analyzer: 'vi_analyzer' },
          image_url: { type: 'keyword', index: false },
          price: { type: 'double' },
          original_price: { type: 'double' },
          options: { type: 'object', enabled: false },
          is_available: { type: 'boolean' },
          tags: { type: 'keyword' },
          tag_ids: { type: 'keyword' },
          location: { type: 'geo_point' },
          rating: { type: 'float' },
          suggest: { type: 'completion' },
        },
      } as unknown as EsMappingType,
    });
    this.logger.log(`Index "${indexName}" created with Vietnamese analyzer & menu properties.`);
  }

  async syncAllRestaurants(): Promise<{ synced: number; error?: string }> {
    try {
      const rawUrl = process.env.RESTAURANT_SERVICE_URL?.trim();
      if (!rawUrl) {
        throw new Error('[ConfigError] RESTAURANT_SERVICE_URL environment variable is required.');
      }
      const url = rawUrl.replace(/\/+$/, '');
      const res = await fetch(`${url}/restaurants`);
      if (!res.ok) return { synced: 0, error: `Restaurant service returned status ${res.status}` };
      const restaurants = (await res.json()) as Array<Record<string, unknown>>;
      if (!Array.isArray(restaurants)) return { synced: 0 };

      let syncedRestaurants = 0;
      let syncedMenuItems = 0;

      for (const r of restaurants) {
        const restId = String(r.id);
        const lat = Number(r.lat);
        const lon = Number(r.lon);
        const rating = Number(r.rating) || 0;
        const name = String(r.name || '');
        const address = r.address ? String(r.address) : undefined;
        const bannerUrl = r.banner_url ? String(r.banner_url) : undefined;
        const totalReviews = Number(r.total_reviews) || 0;

        const rawCategories = Array.isArray(r.categories)
          ? (r.categories as Array<{ name?: string; id?: string }>)
          : [];
        const categories = rawCategories.map((c) => c.name || c.id || '').filter(Boolean);
        const categoryIds = rawCategories.map((c) => c.id || '').filter(Boolean);

        const tags = Array.isArray(r.tags)
          ? (r.tags as Array<{ name?: string; id?: string }>).map((t) => t.name || t.id || '')
          : [];

        await this.indexRestaurant({
          id: restId,
          name,
          address,
          banner_url: bannerUrl,
          location: !Number.isNaN(lat) && !Number.isNaN(lon) ? { lat, lon } : undefined,
          rating,
          total_reviews: totalReviews,
          is_active: r.is_active !== false,
          categories,
          category_ids: categoryIds,
          tags,
          has_promo: Boolean(r.has_promo),
          max_discount_percent: Number(r.max_discount_percent) || 0,
          suggest: [name],
        });
        syncedRestaurants++;

        try {
          const menuRes = await fetch(`${url}/restaurants/${restId}/menu-items`);
          if (menuRes.ok) {
            const menuItems = (await menuRes.json()) as Array<Record<string, unknown>>;
            if (Array.isArray(menuItems)) {
              for (const item of menuItems) {
                const rawTags = Array.isArray(item.tags)
                  ? (item.tags as Array<{ name?: string; id?: string }>)
                  : [];
                const itemTags = rawTags.map((t) => t.name || t.id || '').filter(Boolean);
                const itemTagIds = rawTags.map((t) => t.id || '').filter(Boolean);
                const catObj = item.category as { id?: string; name?: string } | undefined;
                const categoryId = item.category_id
                  ? String(item.category_id)
                  : catObj?.id
                    ? String(catObj.id)
                    : undefined;
                const categoryName = catObj?.name ? String(catObj.name) : undefined;
                const originalPrice =
                  item.original_price !== null && item.original_price !== undefined
                    ? Number(item.original_price)
                    : null;

                await this.indexMenuItem({
                  id: String(item.id),
                  restaurant_id: restId,
                  restaurant_name: name,
                  restaurant_banner_url: bannerUrl,
                  restaurant_address: address,
                  restaurant_total_reviews: totalReviews,
                  category_id: categoryId,
                  category_name: categoryName,
                  name: String(item.name || ''),
                  description: item.description ? String(item.description) : undefined,
                  image_url: item.image_url ? String(item.image_url) : undefined,
                  price: Number(item.price) || 0,
                  original_price: originalPrice,
                  options: Array.isArray(item.options)
                    ? (item.options as MenuItemOptionGroup[])
                    : [],
                  is_available: item.is_available !== false,
                  tags: itemTags,
                  tag_ids: itemTagIds,
                  location: !Number.isNaN(lat) && !Number.isNaN(lon) ? { lat, lon } : undefined,
                  rating,
                  suggest: [String(item.name || '')],
                });
                syncedMenuItems++;
              }
            }
          }
        } catch (menuErr: unknown) {
          this.logger.warn(`Failed to fetch menu items for restaurant ${restId}:`, menuErr);
        }
      }

      this.logger.log(
        `Synced ${syncedRestaurants} restaurants and ${syncedMenuItems} menu items to Elasticsearch.`,
      );
      return { synced: syncedRestaurants };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in syncAllRestaurants: ${msg}`, error instanceof Error ? error.stack : undefined);
      return { synced: 0, error: msg };
    }
  }

  async syncFromRestaurantServiceIfEmpty(): Promise<void> {
    try {
      const countRest = await this.elasticsearchService.count({ index: 'restaurants' });
      const countMenu = await this.elasticsearchService.count({ index: 'menu_items' });

      if (countRest.count === 0 || countMenu.count === 0) {
        this.logger.log('[SearchService] Elasticsearch indices are empty or missing data. Auto-syncing...');
        const result = await this.syncAllRestaurants();
        if (result.synced > 0) {
          this.logger.log(`[SearchService] Auto-sync finished: synced ${result.synced} restaurants.`);
        }
      }
    } catch (error: unknown) {
      this.logger.warn('Failed during syncFromRestaurantServiceIfEmpty:', error);
    }
  }

  async indexRestaurant(restaurant: RestaurantDocument): Promise<unknown> {
    return this.elasticsearchService.index({
      index: 'restaurants',
      id: restaurant.id,
      document: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        banner_url: restaurant.banner_url,
        location: restaurant.location,
        rating: restaurant.rating ?? 0,
        total_reviews: restaurant.total_reviews ?? 0,
        is_active: restaurant.is_active ?? true,
        categories: restaurant.categories ?? [],
        category_ids: restaurant.category_ids ?? [],
        tags: restaurant.tags ?? [],
        has_promo: restaurant.has_promo ?? false,
        max_discount_percent: restaurant.max_discount_percent ?? 0,
        suggest: restaurant.suggest || [restaurant.name],
      },
    });
  }

  async indexMenuItem(item: MenuItemDocument): Promise<unknown> {
    return this.elasticsearchService.index({
      index: 'menu_items',
      id: item.id,
      document: {
        id: item.id,
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurant_name,
        restaurant_banner_url: item.restaurant_banner_url,
        restaurant_address: item.restaurant_address,
        restaurant_total_reviews: item.restaurant_total_reviews ?? 0,
        category_id: item.category_id,
        category_name: item.category_name,
        name: item.name,
        description: item.description,
        image_url: item.image_url,
        price: item.price,
        original_price: item.original_price ?? null,
        options: item.options ?? [],
        is_available: item.is_available,
        tags: item.tags ?? [],
        tag_ids: item.tag_ids ?? [],
        location: item.location,
        rating: item.rating ?? 0,
        suggest: item.suggest || [item.name],
      },
    });
  }

  async updateRestaurantRating(id: string, rating: number): Promise<void> {
    try {
      await this.elasticsearchService.update({
        index: 'restaurants',
        id,
        doc: { rating: Number(rating) || 0 },
      });
      this.logger.log(`Updated Elasticsearch rating for restaurant ${id} to ${rating}`);
    } catch (error: unknown) {
      const err = error as { meta?: { statusCode?: number }; statusCode?: number };
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        this.logger.debug(`Restaurant ${id} not found in Elasticsearch index to update rating`);
      } else {
        this.logger.warn(`Failed to update rating in Elasticsearch for ${id}:`, error);
      }
    }
  }

  async updateMenuItemProjection(id: string, data: Partial<MenuItemDocument>): Promise<void> {
    try {
      await this.elasticsearchService.update({
        index: 'menu_items',
        id,
        doc: data,
      });
      this.logger.log(`[CQRS Projection] Updated menu_item doc ${id}`, data);
    } catch (error: unknown) {
      const err = error as { meta?: { statusCode?: number }; statusCode?: number };
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        this.logger.debug(`MenuItem ${id} not found in Elasticsearch index to update projection`);
      } else {
        this.logger.warn(`Failed to update menu item projection in Elasticsearch for ${id}:`, error);
      }
    }
  }

  async updateRestaurantProjection(id: string, data: Partial<RestaurantDocument>): Promise<void> {
    try {
      await this.elasticsearchService.update({
        index: 'restaurants',
        id,
        doc: data,
      });
      this.logger.log(`[CQRS Projection] Updated restaurant doc ${id}`, data);
    } catch (error: unknown) {
      const err = error as { meta?: { statusCode?: number }; statusCode?: number };
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        this.logger.debug(`Restaurant ${id} not found in Elasticsearch index to update projection`);
      } else {
        this.logger.warn(`Failed to update restaurant projection in Elasticsearch for ${id}:`, error);
      }
    }
  }

  async removeRestaurant(id: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: 'restaurants',
        id,
      });
    } catch (error: unknown) {
      const err = error as { meta?: { statusCode?: number }; statusCode?: number };
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        this.logger.debug(`Restaurant ${id} not found in Elasticsearch index, skipping removal`);
      } else {
        this.logger.warn(`Failed to remove restaurant ${id} from Elasticsearch index:`, error);
      }
    }
  }

  private buildCategoryShouldClauses(rawCategories: string[]): Array<Record<string, unknown>> {
    const uuids: string[] = [];
    const names = new Set<string>();

    for (const raw of rawCategories) {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.toUpperCase() === 'ALL') continue;
      if (UUID_REGEX.test(trimmed)) {
        uuids.push(trimmed);
      } else {
        const lower = trimmed.toLowerCase();
        const aliasNames = CATEGORY_SLUG_ALIASES[lower];
        if (aliasNames) {
          for (const alias of aliasNames) {
            names.add(alias);
          }
        } else {
          names.add(trimmed);
        }
      }
    }

    const shouldClauses: Array<Record<string, unknown>> = [];
    if (uuids.length > 0) {
      shouldClauses.push({ terms: { category_id: uuids } });
    }
    if (names.size > 0) {
      shouldClauses.push({ terms: { 'category_name.keyword': Array.from(names) } });
    }
    return shouldClauses;
  }

  private buildTagShouldClauses(rawTags: string[]): Array<Record<string, unknown>> {
    const uuids: string[] = [];
    const names: string[] = [];

    for (const raw of rawTags) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (UUID_REGEX.test(trimmed)) {
        uuids.push(trimmed);
      } else {
        names.push(trimmed);
      }
    }

    const shouldClauses: Array<Record<string, unknown>> = [];
    if (uuids.length > 0) {
      shouldClauses.push({ terms: { tag_ids: uuids } });
    }
    if (names.length > 0) {
      shouldClauses.push({ terms: { tags: names } });
    }
    return shouldClauses;
  }

  private buildMenuItemQueryParts(params: SearchRestaurantsParams): {
    mustClauses: Array<Record<string, unknown>>;
    filterClauses: Array<Record<string, unknown>>;
  } {
    const mustClauses: Array<Record<string, unknown>> = [];
    const filterClauses: Array<Record<string, unknown>> = [];

    filterClauses.push({ term: { is_available: true } });

    if (params.q && params.q.trim()) {
      mustClauses.push({
        multi_match: {
          query: params.q.trim(),
          fields: ['name^3', 'name.autocomplete^2', 'restaurant_name^2', 'category_name^1.5', 'description'],
          fuzziness: 'AUTO',
        },
      });
    }

    if (params.categories && params.categories.length > 0) {
      const catShould = this.buildCategoryShouldClauses(params.categories);
      if (catShould.length > 0) {
        filterClauses.push({
          bool: {
            should: catShould,
            minimum_should_match: 1,
          },
        });
      }
    }

    if (params.tags && params.tags.length > 0) {
      const tagShould = this.buildTagShouldClauses(params.tags);
      if (tagShould.length > 0) {
        filterClauses.push({
          bool: {
            should: tagShould,
            minimum_should_match: 1,
          },
        });
      }
    }

    if (params.promo === 'discount' || params.promo === 'true') {
      filterClauses.push({
        script: {
          script: {
            source:
              "doc['original_price'].size() > 0 && doc['price'].size() > 0 && doc['original_price'].value > doc['price'].value",
            lang: 'painless',
          },
        },
      });
    }

    const hasGeo =
      params.lat !== undefined &&
      params.lon !== undefined &&
      !Number.isNaN(params.lat) &&
      !Number.isNaN(params.lon);

    if (hasGeo) {
      const radius =
        params.promo === 'freeship' || params.freeship
          ? `${params.freeshipDistanceThreshold ?? 2}km`
          : params.radius || '10km';
      filterClauses.push({
        geo_distance: {
          distance: radius,
          location: { lat: params.lat, lon: params.lon },
        },
      });
    }

    return { mustClauses, filterClauses };
  }

  /**
   * Search restaurants with Multi-Factor Geo-Relevance Ranking (function_score)
   */
  async searchRestaurants(params: SearchRestaurantsParams): Promise<RestaurantDocument[]> {
    try {
      const mustClauses: Array<Record<string, unknown>> = [];
      const filterClauses: Array<Record<string, unknown>> = [];

      if (params.open_only) {
        filterClauses.push({ term: { is_active: true } });
      }

      if (params.q && params.q.trim()) {
        mustClauses.push({
          multi_match: {
            query: params.q.trim(),
            fields: ['name^3', 'name.autocomplete^2', 'categories^2', 'tags'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (params.rating !== undefined && params.rating > 0) {
        filterClauses.push({
          range: {
            rating: { gte: params.rating },
          },
        });
      }

      if (params.categories && params.categories.length > 0) {
        const uuids = params.categories.filter((c) => UUID_REGEX.test(c.trim()));
        const expandedNames = params.categories.flatMap((c) => {
          const lower = c.trim().toLowerCase();
          return CATEGORY_SLUG_ALIASES[lower] ?? [c.trim()];
        });
        const should: Array<Record<string, unknown>> = [];
        if (uuids.length > 0) should.push({ terms: { category_ids: uuids } });
        if (expandedNames.length > 0) should.push({ terms: { categories: expandedNames } });
        if (should.length > 0) {
          filterClauses.push({ bool: { should, minimum_should_match: 1 } });
        }
      }

      if (params.tags && params.tags.length > 0) {
        filterClauses.push({
          terms: { tags: params.tags },
        });
      }

      if (params.promo === 'discount' || params.promo === 'true') {
        filterClauses.push({ term: { has_promo: true } });
      }

      const hasGeo =
        params.lat !== undefined &&
        params.lon !== undefined &&
        !Number.isNaN(params.lat) &&
        !Number.isNaN(params.lon);

      if (hasGeo) {
        let finalRadius = params.radius || '10km';
        if ((params.freeship || params.promo === 'freeship') && params.freeshipDistanceThreshold !== undefined) {
          finalRadius = `${params.freeshipDistanceThreshold}km`;
        }

        filterClauses.push({
          geo_distance: {
            distance: finalRadius,
            location: {
              lat: params.lat,
              lon: params.lon,
            },
          },
        });
      }

      const baseQuery = {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: filterClauses,
        },
      };

      let query: Record<string, unknown> = baseQuery;
      let sort: Array<Record<string, unknown>> | undefined;

      if (params.sort_by === 'distance' && hasGeo) {
        sort = [
          {
            _geo_distance: {
              location: { lat: params.lat, lon: params.lon },
              order: 'asc',
              unit: 'km',
              distance_type: 'arc',
              ignore_unmapped: true,
            },
          },
        ];
      } else if (params.sort_by === 'rating') {
        sort = [{ rating: { order: 'desc' } }];
        if (hasGeo) {
          sort.push({
            _geo_distance: {
              location: { lat: params.lat, lon: params.lon },
              order: 'asc',
              unit: 'km',
            },
          });
        }
      } else if (hasGeo) {
        query = {
          function_score: {
            query: baseQuery,
            functions: [
              {
                gauss: {
                  location: {
                    origin: { lat: params.lat, lon: params.lon },
                    scale: '3km',
                    decay: 0.5,
                  },
                },
                weight: 2.0,
              },
              {
                field_value_factor: {
                  field: 'rating',
                  factor: 1.2,
                  modifier: 'sqrt',
                  missing: 3.0,
                },
                weight: 1.5,
              },
            ],
            score_mode: 'multiply',
            boost_mode: 'multiply',
          },
        };
        sort = [{ _score: { order: 'desc' } }];
      }

      const searchRes = await this.elasticsearchService.search<RestaurantDocument>({
        index: 'restaurants',
        query: query as unknown as EsQueryParam,
        sort: sort as unknown as EsSortParam,
        size: 50,
      });

      return searchRes.hits.hits.map((hit) => hit._source as RestaurantDocument).filter(Boolean);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `searchRestaurants failed: ${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(`Search query failed: ${msg}`, { cause: error });
    }
  }

  /**
   * Search menu items directly in Elasticsearch (legacy non-paginated)
   */
  async searchMenuItems(params: SearchRestaurantsParams): Promise<MenuItemDocument[]> {
    try {
      const { mustClauses, filterClauses } = this.buildMenuItemQueryParts(params);

      const baseQuery = {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: filterClauses,
        },
      };

      const searchRes = await this.elasticsearchService.search<MenuItemDocument>({
        index: 'menu_items',
        query: baseQuery as unknown as EsQueryParam,
        size: 120,
      });

      return searchRes.hits.hits.map((hit) => hit._source as MenuItemDocument).filter(Boolean);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `searchMenuItems failed: ${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(`Menu search failed: ${msg}`, { cause: error });
    }
  }

  /**
   * Paginated Section-Aware Search: Collapse by restaurant_id so a restaurant's menu is never split across pages
   */
  async searchMenuItemsPaginated(
    params: SearchRestaurantsParams,
  ): Promise<PaginatedMenuItemsEsResult> {
    const page = Math.max(1, Math.floor(Number(params.page) || 1));
    const limit = Math.min(30, Math.max(1, Math.floor(Number(params.limit) || 8)));

    try {
      const { mustClauses, filterClauses } = this.buildMenuItemQueryParts(params);
      const baseQuery = {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: filterClauses,
        },
      };

      const sort: Array<Record<string, unknown>> = [];
      if (params.sort_by === 'rating') {
        sort.push({ rating: { order: 'desc' } });
      } else if (
        params.sort_by === 'distance' &&
        params.lat !== undefined &&
        params.lon !== undefined
      ) {
        sort.push({
          _geo_distance: {
            location: { lat: params.lat, lon: params.lon },
            order: 'asc',
            unit: 'km',
            ignore_unmapped: true,
          },
        });
      }

      const collapseRes = await this.elasticsearchService.search<MenuItemDocument>({
        index: 'menu_items',
        query: baseQuery as unknown as EsQueryParam,
        collapse: { field: 'restaurant_id' },
        from: (page - 1) * limit,
        size: limit,
        track_total_hits: true,
        ...(sort.length > 0 ? { sort: sort as unknown as EsSortParam } : {}),
        aggs: {
          total_restaurants: {
            cardinality: { field: 'restaurant_id' },
          },
        },
      });

      const rawTotal = collapseRes.hits.total;
      const totalDishes =
        typeof rawTotal === 'number' ? rawTotal : Number(rawTotal?.value ?? 0);

      const pageRestaurantIds: string[] = [];
      const seenRestIds = new Set<string>();
      for (const hit of collapseRes.hits.hits) {
        const restId = hit._source?.restaurant_id;
        if (restId && !seenRestIds.has(restId)) {
          seenRestIds.add(restId);
          pageRestaurantIds.push(restId);
        }
      }

      const aggTotalRestaurants = Number(
        (collapseRes.aggregations?.total_restaurants as { value?: number } | undefined)?.value ??
          pageRestaurantIds.length,
      );
      const totalRestaurants = Math.max(aggTotalRestaurants, pageRestaurantIds.length);
      const totalPages = totalRestaurants === 0 ? 0 : Math.ceil(totalRestaurants / limit);
      const hasMore = page * limit < totalRestaurants;

      if (pageRestaurantIds.length === 0) {
        return {
          items: [],
          pageRestaurantIds: [],
          restaurantsById: new Map(),
          pagination: {
            page,
            limit,
            totalRestaurants: 0,
            totalDishes: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      }

      const itemsQuery = {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: [...filterClauses, { terms: { restaurant_id: pageRestaurantIds } }],
        },
      };

      const [itemsRes, restMetaRes] = await Promise.all([
        this.elasticsearchService.search<MenuItemDocument>({
          index: 'menu_items',
          query: itemsQuery as unknown as EsQueryParam,
          size: 500,
          track_total_hits: false,
        }),
        this.elasticsearchService
          .search<RestaurantDocument>({
            index: 'restaurants',
            query: {
              terms: { id: pageRestaurantIds },
            } as unknown as EsQueryParam,
            size: pageRestaurantIds.length,
          })
          .catch((restMetaErr: unknown) => {
            this.logger.warn('Failed to load restaurant metadata batch from ES:', restMetaErr);
            return null;
          }),
      ]);

      const restaurantsById = new Map<string, RestaurantDocument>();
      if (restMetaRes) {
        for (const hit of restMetaRes.hits.hits) {
          const doc = hit._source;
          if (doc?.id) {
            restaurantsById.set(doc.id, doc);
          }
        }
      }

      const items = itemsRes.hits.hits
        .map((hit) => hit._source as MenuItemDocument)
        .filter(Boolean);

      return {
        items,
        pageRestaurantIds,
        restaurantsById,
        pagination: {
          page,
          limit,
          totalRestaurants,
          totalDishes,
          totalPages,
          hasMore,
        },
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `searchMenuItemsPaginated failed: ${msg}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(`Paginated menu search failed: ${msg}`, {
        cause: error,
      });
    }
  }

  /**
   * Instant Autocomplete Suggestions: Suggestions for keywords, dishes, restaurants
   */
  async getSuggestions(queryStr: string, lat?: number, lon?: number): Promise<SearchSuggestionsResult> {
    const q = (queryStr || '').trim();
    if (!q || q.length < 2) {
      return { keywords: [], dishes: [], restaurants: [] };
    }

    try {
      const restPromise = this.elasticsearchService.search<RestaurantDocument>({
        index: 'restaurants',
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: q,
                  fields: ['name^3', 'name.autocomplete^2', 'categories'],
                  fuzziness: 'AUTO',
                },
              },
            ],
            filter: [{ term: { is_active: true } }],
          },
        },
        size: 5,
      });

      const menuPromise = this.elasticsearchService.search<MenuItemDocument>({
        index: 'menu_items',
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: q,
                  fields: ['name^3', 'name.autocomplete^2', 'description'],
                  fuzziness: 'AUTO',
                },
              },
            ],
            filter: [{ term: { is_available: true } }],
          },
        },
        size: 5,
      });

      const [restHits, menuHits] = await Promise.all([restPromise, menuPromise]);

      const keywordSet = new Set<string>();

      const restaurants = restHits.hits.hits.map((hit) => {
        const source = hit._source as RestaurantDocument;
        if (source?.name) keywordSet.add(source.name);

        let distanceKm: number | undefined;
        if (lat !== undefined && lon !== undefined && source?.location) {
          distanceKm = calculateHaversineKm(lat, lon, source.location.lat, source.location.lon);
        }

        return {
          id: source.id,
          name: source.name,
          rating: source.rating ?? 0,
          distance_km: distanceKm,
        };
      });

      const dishes = menuHits.hits.hits.map((hit) => {
        const source = hit._source as MenuItemDocument;
        if (source?.name) keywordSet.add(source.name);
        return {
          id: source.id,
          name: source.name,
          price: source.price,
          restaurant_id: source.restaurant_id,
          restaurant_name: source.restaurant_name,
        };
      });

      return {
        keywords: Array.from(keywordSet).slice(0, 5),
        dishes,
        restaurants,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`getSuggestions query error: ${msg}`);
      return { keywords: [], dishes: [], restaurants: [] };
    }
  }
}

export function calculateHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
