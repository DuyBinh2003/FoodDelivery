import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { CreateRestaurantDto } from '@/modules/restaurants/dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from '@/modules/restaurants/dto/update-restaurant.dto.js';
import { CreateMenuItemDto } from '@/modules/restaurants/dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from '@/modules/restaurants/dto/update-menu-item.dto.js';
import { CreateRestaurantUseCase } from '@/modules/restaurants/usecases/create-restaurant.usecase.js';
import { GetRestaurantsUseCase } from '@/modules/restaurants/usecases/get-restaurants.usecase.js';
import { GetRestaurantUseCase } from '@/modules/restaurants/usecases/get-restaurant.usecase.js';
import { UpdateRestaurantUseCase } from '@/modules/restaurants/usecases/update-restaurant.usecase.js';
import { DeleteRestaurantUseCase } from '@/modules/restaurants/usecases/delete-restaurant.usecase.js';
import { AddMenuItemUseCase } from '@/modules/restaurants/usecases/add-menu-item.usecase.js';
import { GetMenuItemsUseCase } from '@/modules/restaurants/usecases/get-menu-items.usecase.js';
import { UpdateMenuItemUseCase } from '@/modules/restaurants/usecases/update-menu-item.usecase.js';
import { DeleteMenuItemUseCase } from '@/modules/restaurants/usecases/delete-menu-item.usecase.js';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly createRestaurantUseCase: CreateRestaurantUseCase,
    private readonly getRestaurantsUseCase: GetRestaurantsUseCase,
    private readonly getRestaurantUseCase: GetRestaurantUseCase,
    private readonly updateRestaurantUseCase: UpdateRestaurantUseCase,
    private readonly deleteRestaurantUseCase: DeleteRestaurantUseCase,
    private readonly addMenuItemUseCase: AddMenuItemUseCase,
    private readonly getMenuItemsUseCase: GetMenuItemsUseCase,
    private readonly updateMenuItemUseCase: UpdateMenuItemUseCase,
    private readonly deleteMenuItemUseCase: DeleteMenuItemUseCase,
  ) {}

  @Post()
  create(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.createRestaurantUseCase.execute(createRestaurantDto);
  }

  @Get()
  findAll() {
    return this.getRestaurantsUseCase.execute();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.getRestaurantUseCase.execute({ restaurantId: id });
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateRestaurantDto: UpdateRestaurantDto
  ) {
    return this.updateRestaurantUseCase.execute({ restaurantId: id, dto: updateRestaurantDto });
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deleteRestaurantUseCase.execute({ restaurantId: id });
  }

  // --- Menu Item Endpoints ---

  @Post(':id/menu-items')
  addMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createMenuItemDto: CreateMenuItemDto
  ) {
    return this.addMenuItemUseCase.execute({ restaurantId: id, dto: createMenuItemDto });
  }

  @Get(':id/menu-items')
  findMenuItems(@Param('id', ParseUUIDPipe) id: string) {
    return this.getMenuItemsUseCase.execute({ restaurantId: id });
  }

  @Patch(':id/menu-items/:itemId')
  updateMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto
  ) {
    return this.updateMenuItemUseCase.execute({ restaurantId: id, itemId, dto: updateMenuItemDto });
  }

  @Delete(':id/menu-items/:itemId')
  removeMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string
  ) {
    return this.deleteMenuItemUseCase.execute({ restaurantId: id, itemId });
  }
}

