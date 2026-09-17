import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantsService } from '@/modules/restaurants/restaurants.service.js';
import { RestaurantsController } from '@/modules/restaurants/restaurants.controller.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { MenuItem } from '@/modules/restaurants/entities/menu-item.entity.js';
import { Category } from '@/modules/restaurants/entities/category.entity.js';
import { Tag } from '@/modules/restaurants/entities/tag.entity.js';
import { Config } from '@/modules/restaurants/entities/config.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant, MenuItem, Category, Tag, Config])],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
