import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantsController } from '@/modules/restaurants/restaurants.controller.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { Config } from '@/modules/restaurants/entities/config.entity.js';

import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';
import { RestaurantWriteRepository } from '@/modules/restaurants/repositories/restaurant.write.repository.js';

import { CreateRestaurantUseCase } from '@/modules/restaurants/usecases/create-restaurant.usecase.js';
import { GetRestaurantsUseCase } from '@/modules/restaurants/usecases/get-restaurants.usecase.js';
import { GetRestaurantUseCase } from '@/modules/restaurants/usecases/get-restaurant.usecase.js';
import { UpdateRestaurantUseCase } from '@/modules/restaurants/usecases/update-restaurant.usecase.js';
import { DeleteRestaurantUseCase } from '@/modules/restaurants/usecases/delete-restaurant.usecase.js';
import { AddMenuItemUseCase } from '@/modules/restaurants/usecases/add-menu-item.usecase.js';
import { GetMenuItemsUseCase } from '@/modules/restaurants/usecases/get-menu-items.usecase.js';
import { UpdateMenuItemUseCase } from '@/modules/restaurants/usecases/update-menu-item.usecase.js';
import { DeleteMenuItemUseCase } from '@/modules/restaurants/usecases/delete-menu-item.usecase.js';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, MenuItem, Category, Tag, Config])],
  controllers: [RestaurantsController],
  providers: [
    RestaurantReadRepository,
    RestaurantWriteRepository,
    CreateRestaurantUseCase,
    GetRestaurantsUseCase,
    GetRestaurantUseCase,
    UpdateRestaurantUseCase,
    DeleteRestaurantUseCase,
    AddMenuItemUseCase,
    GetMenuItemsUseCase,
    UpdateMenuItemUseCase,
    DeleteMenuItemUseCase,
  ],
  exports: [
    RestaurantReadRepository,
    RestaurantWriteRepository,
    CreateRestaurantUseCase,
    GetRestaurantsUseCase,
    GetRestaurantUseCase,
    UpdateRestaurantUseCase,
    DeleteRestaurantUseCase,
    AddMenuItemUseCase,
    GetMenuItemsUseCase,
    UpdateMenuItemUseCase,
    DeleteMenuItemUseCase,
  ],
})
export class RestaurantsModule {}
