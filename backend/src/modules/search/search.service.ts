import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { DataSource } from 'typeorm';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(
    @Inject(ElasticsearchService) private readonly elasticsearchService: ElasticsearchService,
    @Inject(DataSource) private readonly dataSource: DataSource
  ) {}

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

  // Fetch all categories from Postgres
  async getCategories() {
    const categoryRepo = this.dataSource.getRepository(Category);
    return categoryRepo.find({ where: { is_deleted: false } });
  }

  // Fetch all tags from Postgres
  async getTags() {
    const tagRepo = this.dataSource.getRepository(Tag);
    return tagRepo.find();
  }

  // Search menu: get restaurants from ES, then fetch menu items from Postgres
  async searchMenu(params: {
    q?: string;
    lat?: number;
    lon?: number;
    radius?: string;
    rating?: number;
    categories?: string[];
    tags?: string[];
    freeship?: boolean;
    freeshipDistanceThreshold?: number;
  }) {
    // 1. Get matching restaurants from ES
    const restaurants = await this.searchRestaurants(params) as any[];

    if (!restaurants || restaurants.length === 0) {
      return [];
    }

    const restaurantIds = restaurants.map(r => r.id);

    // 2. Fetch menu items for these restaurants from DB
    const menuItemRepo = this.dataSource.getRepository(MenuItem);
    
    // We should also apply the keyword and tag filters to the menu items
    const qb = menuItemRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.tags', 'tag')
      .where('item.restaurant_id IN (:...restaurantIds)', { restaurantIds })
      .andWhere('item.is_deleted = :isDeleted', { isDeleted: false });

    // Filter menu items by name if search keyword is provided
    if (params.q) {
      qb.andWhere('item.name ILIKE :q', { q: `%${params.q}%` });
    }

    // Filter menu items by tags if tag filter is applied
    if (params.tags && params.tags.length > 0) {
      qb.andWhere('tag.id IN (:...tags)', { tags: params.tags });
    }

    const menuItems = await qb.getMany();

    // 3. Format response: [{ restaurant: 'Name', items: [...] }]
    const result = restaurants.map(restaurant => {
      const itemsForRestaurant = menuItems.filter(item => item.restaurant_id === restaurant.id);
      return {
        restaurant: restaurant.name,
        items: itemsForRestaurant.map(item => ({
          ...item,
          restaurant_name: restaurant.name
        }))
      };
    }).filter(r => r.items.length > 0); // Only return restaurants that have matching items

    return result;
  }
}
