import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class ElasticsearchRepository implements OnModuleInit {
  constructor(
    @Inject(ElasticsearchService) private readonly elasticsearchService: ElasticsearchService
  ) {}

  async onModuleInit() {
    await this.createIndices();
    setTimeout(() => {
      this.syncFromRestaurantServiceIfEmpty().catch(() => {});
    }, 5000);
  }

  private async createIndices() {
    const indexName = 'restaurants';
    const indexExists = await this.elasticsearchService.indices.exists({ index: indexName });

    if (!indexExists) {
      await this.elasticsearchService.indices.create({
        index: indexName,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: { 
              type: 'text',
              analyzer: 'standard',
            },
            location: { type: 'geo_point' },
            rating: { type: 'float' },
            categories: { type: 'keyword' },
            tags: { type: 'keyword' },
          }
        }
      });
      console.log(`Index ${indexName} created successfully.`);
    }
  }

  async syncAllRestaurants(): Promise<{ synced: number; error?: string }> {
    try {
      const url = process.env.RESTAURANT_SERVICE_URL!;
      const res = await fetch(`${url}/restaurants`);
      if (!res.ok) return { synced: 0, error: 'Restaurant service unavailable' };
      const restaurants = (await res.json()) as Array<Record<string, unknown>>;
      if (!Array.isArray(restaurants)) return { synced: 0 };

      let syncedCount = 0;
      for (const restaurant of restaurants) {
        await this.indexRestaurant(restaurant);
        syncedCount++;
      }
      return { synced: syncedCount };
    } catch (e: unknown) {
      const err = e as Error;
      return { synced: 0, error: err.message };
    }
  }

  async syncFromRestaurantServiceIfEmpty(): Promise<void> {
    try {
      const countRes = await this.elasticsearchService.count({ index: 'restaurants' });
      if (countRes.count === 0) {
        console.log('[SearchService] Elasticsearch index "restaurants" is empty. Auto-syncing from restaurant-service...');
        const result = await this.syncAllRestaurants();
        if (result.synced > 0) {
          console.log(`[SearchService] Auto-sync finished: synced ${result.synced} restaurants into Elasticsearch.`);
        }
      }
    } catch {
      // Ignore if restaurant service is still starting up
    }
  }

  async indexRestaurant(restaurant: any) {
    return this.elasticsearchService.index({
      index: 'restaurants',
      id: restaurant.id,
      document: {
        id: restaurant.id,
        name: restaurant.name,
        location: {
          lat: restaurant.lat,
          lon: restaurant.lon,
        },
        rating: restaurant.rating,
        categories: restaurant.categories ? restaurant.categories.map((c: any) => c.name || c.id) : [],
        tags: restaurant.tags ? restaurant.tags.map((t: any) => t.name || t.id) : [],
      },
    });
  }

  async removeRestaurant(id: string) {
    try {
      await this.elasticsearchService.delete({
        index: 'restaurants',
        id: id,
      });
    } catch (_e) {
      // Ignore not found errors
    }
  }

  async searchRestaurants(params: any) {
    const must: any[] = [];
    const filter: any[] = [];

    if (params.q) {
      must.push({
        match: {
          name: {
            query: params.q,
            fuzziness: 'AUTO',
          }
        }
      });
    }

    if (params.rating) {
      filter.push({
        range: {
          rating: {
            gte: params.rating
          }
        }
      });
    }

    if (params.categories && params.categories.length > 0) {
      filter.push({
        terms: {
          categories: params.categories
        }
      });
    }

    if (params.tags && params.tags.length > 0) {
      filter.push({
        terms: {
          tags: params.tags
        }
      });
    }

    if (params.lat !== undefined && params.lon !== undefined) {
      let finalRadius = params.radius || '10km';
      if (params.freeship && params.freeshipDistanceThreshold !== undefined) {
        finalRadius = `${params.freeshipDistanceThreshold}km`;
      }

      filter.push({
        geo_distance: {
          distance: finalRadius,
          location: {
            lat: params.lat,
            lon: params.lon
          }
        }
      });
    }

    const { hits } = await this.elasticsearchService.search({
      index: 'restaurants',
      query: {
        bool: {
          must: must.length > 0 ? must : { match_all: {} },
          filter: filter
        }
      },
      sort: params.lat !== undefined && params.lon !== undefined ? [
        {
          _geo_distance: {
            location: { lat: params.lat, lon: params.lon },
            order: 'asc',
            unit: 'km',
            mode: 'min',
            distance_type: 'arc',
            ignore_unmapped: true
          }
        }
      ] : undefined
    });

    return hits.hits.map(hit => hit._source);
  }
}
