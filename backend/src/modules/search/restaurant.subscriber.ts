import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { SearchService } from '@/modules/search/search.service.js';

@Injectable()
export class RestaurantSubscriber implements EntitySubscriberInterface<Restaurant>, OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly searchService: SearchService,
  ) {}

  onModuleInit() {
    this.dataSource.subscribers.push(this);
  }

  listenTo() {
    return Restaurant;
  }

  async afterInsert(event: InsertEvent<Restaurant>) {
    await this.searchService.indexRestaurant(event.entity);
  }

  async afterUpdate(event: UpdateEvent<Restaurant>) {
    // Need to fetch full entity because event.entity might only contain updated fields
    if (event.entity) {
      const fullRestaurant = await event.manager.findOne(Restaurant, {
        where: { id: event.entity.id as string },
        relations: { categories: true } as any
      });
      if (fullRestaurant) {
        await this.searchService.indexRestaurant(fullRestaurant);
      }
    }
  }

  async afterRemove(event: RemoveEvent<Restaurant>) {
    if (event.entityId) {
      await this.searchService.removeRestaurant(event.entityId as string);
    }
  }
}
