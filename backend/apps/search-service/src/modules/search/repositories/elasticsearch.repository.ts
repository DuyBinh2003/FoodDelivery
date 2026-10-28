import { Inject, Injectable, OnModuleInit, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

export interface RestaurantDocument {
  id: string;
  name: string;
  location?: { lat: number; lon: number };
  rating?: number;
  total_reviews?: number;
  is_active?: boolean;
  categories?: string[];
  tags?: string[];
  suggest?: string[];
}

export interface MenuItemDocument {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  name: string;
  description?: string;
  price: number;
  is_available: boolean;
  tags?: string[];
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
    @Inject(ElasticsearchService) private readonly elasticsearchService: ElasticsearchService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.createIndices();
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.warn(`Elasticsearch initial index check failed: ${err.message}. Retrying in 5s...`);
      setTimeout(() => {
        this.createIndices().catch((retryErr: unknown) => {
          this.logger.warn(`Retry creating indices failed:`, retryErr);
        });
      }, 5000);
    }

    setTimeout(() => {
      this.syncFromRestaurantServiceIfEmpty().catch((syncErr: unknown) => {
        this.logger.warn(`Background sync from restaurant-service failed:`, syncErr);
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

    // 1. Index 'restaurants'
    const restaurantIndex = 'restaurants';
    const restExists = await this.elasticsearchService.indices.exists({ index: restaurantIndex });
    if (restExists) {
      // Check if it has custom vi_analyzer; if not, recreate to upgrade mapping
      try {
        const settings = await this.elasticsearchService.indices.getSettings({ index: restaurantIndex });
        const hasViAnalyzer = Boolean(
          (settings as Record<string, any>)[restaurantIndex]?.settings?.index?.analysis?.analyzer?.vi_analyzer
        );
        if (!hasViAnalyzer) {
          this.logger.log(`Upgrading index "${restaurantIndex}" to include vi_analyzer...`);
          await this.elasticsearchService.indices.delete({ index: restaurantIndex });
          await this.createRestaurantIndex(restaurantIndex, analysisSettings);
        }
      } catch (err) {
        this.logger.warn(`Could not verify settings of ${restaurantIndex}:`, err);
      }
    } else {
      await this.createRestaurantIndex(restaurantIndex, analysisSettings);
    }

    // 2. Index 'menu_items'
    const menuIndex = 'menu_items';
    const menuExists = await this.elasticsearchService.indices.exists({ index: menuIndex });
    if (!menuExists) {
      await this.createMenuItemIndex(menuIndex, analysisSettings);
    }
  }

  private async createRestaurantIndex(indexName: string, analysisSettings: Record<string, unknown>): Promise<void> {
    await this.elasticsearchService.indices.create({
      index: indexName,
      settings: {
        analysis: analysisSettings,
      },
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
          location: { type: 'geo_point' },
          rating: { type: 'float' },
          total_reviews: { type: 'integer' },
          is_active: { type: 'boolean' },
          categories: { type: 'keyword' },
          tags: { type: 'keyword' },
          suggest: { type: 'completion' },
        },
      },
    });
    this.logger.log(`Index "${indexName}" created with Vietnamese analyzer & suggest mapping.`);
  }

  private async createMenuItemIndex(indexName: string, analysisSettings: Record<string, unknown>): Promise<void> {
    await this.elasticsearchService.indices.create({
      index: indexName,
      settings: {
        analysis: analysisSettings,
      },
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
          name: {
            type: 'text',
            analyzer: 'vi_analyzer',
            fields: {
              autocomplete: { type: 'text', analyzer: 'autocomplete_analyzer' },
              keyword: { type: 'keyword' },
            },
          },
          description: { type: 'text', analyzer: 'vi_analyzer' },
          price: { type: 'double' },
          is_available: { type: 'boolean' },
          tags: { type: 'keyword' },
          location: { type: 'geo_point' },
          rating: { type: 'float' },
          suggest: { type: 'completion' },
        },
      },
    });
    this.logger.log(`Index "${indexName}" created with Vietnamese analyzer & menu properties.`);
  }

  async syncAllRestaurants(): Promise<{ synced: number; error?: string }> {
    try {
      const url = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';
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

        const categories = Array.isArray(r.categories)
          ? (r.categories as Array<{ name?: string; id?: string }>).map((c) => c.name || c.id || '')
          : [];

        const tags = Array.isArray(r.tags)
          ? (r.tags as Array<{ name?: string; id?: string }>).map((t) => t.name || t.id || '')
          : [];

        await this.indexRestaurant({
          id: restId,
          name,
          location: !isNaN(lat) && !isNaN(lon) ? { lat, lon } : undefined,
          rating,
          is_active: r.is_active !== false,
          categories,
          tags,
          suggest: [name],
        });
        syncedRestaurants++;

        // Fetch and index menu items for this restaurant
        try {
          const menuRes = await fetch(`${url}/restaurants/${restId}/menu-items`);
          if (menuRes.ok) {
            const menuItems = (await menuRes.json()) as Array<Record<string, unknown>>;
            if (Array.isArray(menuItems)) {
              for (const item of menuItems) {
                const itemTags = Array.isArray(item.tags)
                  ? (item.tags as Array<{ name?: string; id?: string }>).map((t) => t.name || t.id || '')
                  : [];

                await this.indexMenuItem({
                  id: String(item.id),
                  restaurant_id: restId,
                  restaurant_name: name,
                  name: String(item.name || ''),
                  description: item.description ? String(item.description) : undefined,
                  price: Number(item.price) || 0,
                  is_available: item.is_available !== false,
                  tags: itemTags,
                  location: !isNaN(lat) && !isNaN(lon) ? { lat, lon } : undefined,
                  rating,
                  suggest: [String(item.name || '')],
                });
                syncedMenuItems++;
              }
            }
          }
        } catch (menuErr) {
          this.logger.warn(`Failed to fetch menu items for restaurant ${restId}:`, menuErr);
        }
      }

      this.logger.log(`Synced ${syncedRestaurants} restaurants and ${syncedMenuItems} menu items to Elasticsearch.`);
      return { synced: syncedRestaurants };
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.error(`Error in syncAllRestaurants: ${err.message}`, err.stack);
      return { synced: 0, error: err.message };
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
    } catch (err) {
      this.logger.warn('Failed during syncFromRestaurantServiceIfEmpty:', err);
    }
  }

  async indexRestaurant(restaurant: RestaurantDocument): Promise<unknown> {
    return this.elasticsearchService.index({
      index: 'restaurants',
      id: restaurant.id,
      document: {
        id: restaurant.id,
        name: restaurant.name,
        location: restaurant.location,
        rating: restaurant.rating ?? 0,
        total_reviews: restaurant.total_reviews ?? 0,
        is_active: restaurant.is_active ?? true,
        categories: restaurant.categories ?? [],
        tags: restaurant.tags ?? [],
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
        name: item.name,
        description: item.description,
        price: item.price,
        is_available: item.is_available,
        tags: item.tags ?? [],
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
      const err = error as { meta?: { statusCode?: number }; statusCode?: number; message?: string };
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        this.logger.debug(`Restaurant ${id} not found in Elasticsearch index to update rating`);
      } else {
        this.logger.warn(`Failed to update rating in Elasticsearch for ${id}:`, error);
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
      const err = error as { meta?: { statusCode?: number }; statusCode?: number; message?: string };
      if (err?.meta?.statusCode === 404 || err?.statusCode === 404) {
        this.logger.debug(`Restaurant ${id} not found in Elasticsearch index, skipping removal`);
      } else {
        this.logger.warn(`Failed to remove restaurant ${id} from Elasticsearch index:`, error);
      }
    }
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
        filterClauses.push({
          terms: { categories: params.categories },
        });
      }

      if (params.tags && params.tags.length > 0) {
        filterClauses.push({
          terms: { tags: params.tags },
        });
      }

      const hasGeo = params.lat !== undefined && params.lon !== undefined && !isNaN(params.lat) && !isNaN(params.lon);

      if (hasGeo) {
        let finalRadius = params.radius || '10km';
        if (params.freeship && params.freeshipDistanceThreshold !== undefined) {
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

      // Relevance vs Distance vs Rating sorting
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
      } else {
        // Multi-Factor Geo-Relevance Ranking via function_score
        if (hasGeo) {
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
      }

      const searchRes = await this.elasticsearchService.search<RestaurantDocument>({
        index: 'restaurants',
        query: query as any,
        sort: sort as any,
        size: 50,
      });

      return searchRes.hits.hits.map((hit) => hit._source as RestaurantDocument).filter(Boolean);
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.error(`searchRestaurants failed: ${err.message}`, err.stack);
      throw new ServiceUnavailableException(`Search query failed: ${err.message}`, { cause: err });
    }
  }

  /**
   * Search menu items directly in Elasticsearch
   */
  async searchMenuItems(params: SearchRestaurantsParams): Promise<MenuItemDocument[]> {
    try {
      const mustClauses: Array<Record<string, unknown>> = [];
      const filterClauses: Array<Record<string, unknown>> = [];

      filterClauses.push({ term: { is_available: true } });

      if (params.q && params.q.trim()) {
        mustClauses.push({
          multi_match: {
            query: params.q.trim(),
            fields: ['name^3', 'name.autocomplete^2', 'restaurant_name^2', 'description'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (params.tags && params.tags.length > 0) {
        filterClauses.push({
          terms: { tags: params.tags },
        });
      }

      const hasGeo = params.lat !== undefined && params.lon !== undefined && !isNaN(params.lat) && !isNaN(params.lon);

      if (hasGeo) {
        const radius = params.radius || '10km';
        filterClauses.push({
          geo_distance: {
            distance: radius,
            location: { lat: params.lat, lon: params.lon },
          },
        });
      }

      const baseQuery = {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }],
          filter: filterClauses,
        },
      };

      const searchRes = await this.elasticsearchService.search<MenuItemDocument>({
        index: 'menu_items',
        query: baseQuery as any,
        size: 60,
      });

      return searchRes.hits.hits.map((hit) => hit._source as MenuItemDocument).filter(Boolean);
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.error(`searchMenuItems failed: ${err.message}`, err.stack);
      throw new ServiceUnavailableException(`Menu search failed: ${err.message}`, { cause: err });
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
      // 1. Query restaurants matching prefix
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

      // 2. Query dishes matching prefix
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
    } catch (e: unknown) {
      const err = e as Error;
      this.logger.warn(`getSuggestions query error: ${err.message}`);
      return { keywords: [], dishes: [], restaurants: [] };
    }
  }
}

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
