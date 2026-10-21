import { RestaurantsInternalController } from '@/modules/restaurants/restaurants.internal.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@/common/guards/jwt.strategy.js';
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

import { GetPartnerRestaurantUseCase } from '@/modules/restaurants/usecases/get-partner-restaurant.usecase.js';
import { UpdatePartnerRestaurantStatusUseCase } from '@/modules/restaurants/usecases/update-partner-restaurant-status.usecase.js';
import { UpdatePartnerRestaurantProfileUseCase } from '@/modules/restaurants/usecases/update-partner-restaurant-profile.usecase.js';
import { CreatePartnerMenuItemUseCase } from '@/modules/restaurants/usecases/create-partner-menu-item.usecase.js';
import { UpdatePartnerMenuItemUseCase } from '@/modules/restaurants/usecases/update-partner-menu-item.usecase.js';
import { DeletePartnerMenuItemUseCase } from '@/modules/restaurants/usecases/delete-partner-menu-item.usecase.js';
import { GetCategoriesUseCase } from '@/modules/restaurants/usecases/get-categories.usecase.js';
import { GetTagsUseCase } from '@/modules/restaurants/usecases/get-tags.usecase.js';
import { CreateTagUseCase } from '@/modules/restaurants/usecases/create-tag.usecase.js';
import { StorageModule } from '@/common/storage/index.js';

@Module({
  imports: [
    StorageModule,
    TypeOrmModule.forFeature([Restaurant, MenuItem, Category, Tag, Config]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [RestaurantsController, RestaurantsInternalController],
  providers: [
    RestaurantReadRepository,
    RestaurantWriteRepository,
    JwtStrategy,
    CreateRestaurantUseCase,
    GetRestaurantsUseCase,
    GetRestaurantUseCase,
    UpdateRestaurantUseCase,
    DeleteRestaurantUseCase,
    AddMenuItemUseCase,
    GetMenuItemsUseCase,
    UpdateMenuItemUseCase,
    DeleteMenuItemUseCase,
    GetPartnerRestaurantUseCase,
    UpdatePartnerRestaurantStatusUseCase,
    UpdatePartnerRestaurantProfileUseCase,
    CreatePartnerMenuItemUseCase,
    UpdatePartnerMenuItemUseCase,
    DeletePartnerMenuItemUseCase,
    GetCategoriesUseCase,
    GetTagsUseCase,
    CreateTagUseCase,
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
    GetPartnerRestaurantUseCase,
    UpdatePartnerRestaurantStatusUseCase,
    UpdatePartnerRestaurantProfileUseCase,
    CreatePartnerMenuItemUseCase,
    UpdatePartnerMenuItemUseCase,
    DeletePartnerMenuItemUseCase,
    GetCategoriesUseCase,
    GetTagsUseCase,
    CreateTagUseCase,
  ],
})
export class RestaurantsModule {}

