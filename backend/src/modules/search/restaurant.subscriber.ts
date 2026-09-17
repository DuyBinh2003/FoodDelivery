import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { SyncRestaurantIndexUseCase } from '@/modules/search/usecases/sync-restaurant-index.usecase.js';

@Injectable()
export class RestaurantSubscriber implements EntitySubscriberInterface<Restaurant>, OnModuleInit {
  constructor(
    @Inject(DataSource) private readonly dataSource: DataSource,
    private readonly syncRestaurantIndexUseCase: SyncRestaurantIndexUseCase,
  ) {}

  onModuleInit() {
    this.dataSource.subscribers.push(this);
  }

  listenTo() {
    return Restaurant;
  }

  async afterInsert(event: InsertEvent<Restaurant>) {
    await this.syncRestaurantIndexUseCase.indexRestaurant(event.entity);
  }

  async afterUpdate(event: UpdateEvent<Restaurant>) {
    if (event.entity) {
      const fullRestaurant = await event.manager.findOne(Restaurant, {
        where: { id: event.entity.id as string },
        relations: { categories: true } as any
      });
      if (fullRestaurant) {
        await this.syncRestaurantIndexUseCase.indexRestaurant(fullRestaurant);
      }
    }
  }

  async afterRemove(event: RemoveEvent<Restaurant>) {
    if (event.entityId) {
      await this.syncRestaurantIndexUseCase.removeRestaurant(event.entityId as string);
    }
  }
}
