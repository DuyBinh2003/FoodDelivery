import { Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  async onModuleInit() {
    await this.createIndices();
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
                analyzer: 'standard', // For real app, use Vietnamese analyzer if available
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

  // Sync a single restaurant document
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

  // Remove restaurant from index
  async removeRestaurant(id: string) {
    try {
      await this.elasticsearchService.delete({
        index: 'restaurants',
        id: id,
      });
    } catch (e) {
      // Ignore not found errors
    }
  }

  // Search logic
  async searchRestaurants(params: {
    q?: string;
    lat?: number;
    lon?: number;
    radius?: string;
    rating?: number;
    categories?: string[];
    tags?: string[];
    freeship?: boolean;
    freeshipDistanceThreshold?: number; // from m_config
  }) {
    const must: any[] = [];
    const filter: any[] = [];

    // Full-text search on name
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

    // Rating filter
    if (params.rating) {
      filter.push({
        range: {
          rating: {
            gte: params.rating
          }
        }
      });
    }

    // Categories filter
    if (params.categories && params.categories.length > 0) {
      filter.push({
        terms: {
          categories: params.categories
        }
      });
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      filter.push({
        terms: {
          tags: params.tags
        }
      });
    }

    // Geo-distance filter for standard radius search or freeship search
    if (params.lat !== undefined && params.lon !== undefined) {
      // If freeship is true, we restrict distance to freeshipDistanceThreshold
      // Otherwise use the requested radius or default 10km
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
    } else if (params.freeship) {
      // If they want freeship but didn't provide lat/lon, we might not be able to filter by distance.
      // Usually handled by throwing an error or skipping.
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
