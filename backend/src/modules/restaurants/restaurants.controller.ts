import { Controller, Get, Inject, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { RestaurantsService } from '@/modules/restaurants/restaurants.service.js';
import { CreateRestaurantDto } from '@/modules/restaurants/dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from '@/modules/restaurants/dto/update-restaurant.dto.js';
import { CreateMenuItemDto } from '@/modules/restaurants/dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from '@/modules/restaurants/dto/update-menu-item.dto.js';

@Controller('restaurants')
export class RestaurantsController {
  constructor(@Inject(RestaurantsService) private readonly restaurantsService: RestaurantsService) {}

  @Post()
  create(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.create(createRestaurantDto);
  }

  @Get()
  findAll() {
    return this.restaurantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateRestaurantDto: UpdateRestaurantDto
  ) {
    return this.restaurantsService.update(id, updateRestaurantDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.remove(id);
  }

  // --- Menu Item Endpoints ---

  @Post(':id/menu-items')
  addMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createMenuItemDto: CreateMenuItemDto
  ) {
    return this.restaurantsService.addMenuItem(id, createMenuItemDto);
  }

  @Get(':id/menu-items')
  findMenuItems(@Param('id', ParseUUIDPipe) id: string) {
    return this.restaurantsService.findMenuItems(id);
  }

  @Patch(':id/menu-items/:itemId')
  updateMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto
  ) {
    return this.restaurantsService.updateMenuItem(id, itemId, updateMenuItemDto);
  }

  @Delete(':id/menu-items/:itemId')
  removeMenuItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string
  ) {
    return this.restaurantsService.removeMenuItem(id, itemId);
  }
}
