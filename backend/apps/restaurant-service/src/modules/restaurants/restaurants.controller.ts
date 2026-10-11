import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import type { JwtPayload } from '@/common/guards/jwt.strategy.js';
import { CreateRestaurantDto } from '@/modules/restaurants/dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from '@/modules/restaurants/dto/update-restaurant.dto.js';
import { CreateMenuItemDto } from '@/modules/restaurants/dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from '@/modules/restaurants/dto/update-menu-item.dto.js';
import { CreatePartnerMenuItemDto } from '@/modules/restaurants/dto/create-partner-menu-item.dto.js';
import { UpdatePartnerMenuItemDto } from '@/modules/restaurants/dto/update-partner-menu-item.dto.js';
import { UpdateRestaurantStatusDto } from '@/modules/restaurants/dto/update-restaurant-status.dto.js';
import { UpdateRestaurantProfileDto } from '@/modules/restaurants/dto/update-restaurant-profile.dto.js';

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

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    @Inject(CreateRestaurantUseCase) private readonly createRestaurantUseCase: CreateRestaurantUseCase,
    @Inject(GetRestaurantsUseCase) private readonly getRestaurantsUseCase: GetRestaurantsUseCase,
    @Inject(GetRestaurantUseCase) private readonly getRestaurantUseCase: GetRestaurantUseCase,
    @Inject(UpdateRestaurantUseCase) private readonly updateRestaurantUseCase: UpdateRestaurantUseCase,
    @Inject(DeleteRestaurantUseCase) private readonly deleteRestaurantUseCase: DeleteRestaurantUseCase,
    @Inject(AddMenuItemUseCase) private readonly addMenuItemUseCase: AddMenuItemUseCase,
    @Inject(GetMenuItemsUseCase) private readonly getMenuItemsUseCase: GetMenuItemsUseCase,
    @Inject(UpdateMenuItemUseCase) private readonly updateMenuItemUseCase: UpdateMenuItemUseCase,
    @Inject(DeleteMenuItemUseCase) private readonly deleteMenuItemUseCase: DeleteMenuItemUseCase,
    @Inject(GetPartnerRestaurantUseCase) private readonly getPartnerRestaurantUseCase: GetPartnerRestaurantUseCase,
    @Inject(UpdatePartnerRestaurantStatusUseCase) private readonly updatePartnerRestaurantStatusUseCase: UpdatePartnerRestaurantStatusUseCase,
    @Inject(UpdatePartnerRestaurantProfileUseCase) private readonly updatePartnerRestaurantProfileUseCase: UpdatePartnerRestaurantProfileUseCase,
    @Inject(CreatePartnerMenuItemUseCase) private readonly createPartnerMenuItemUseCase: CreatePartnerMenuItemUseCase,
    @Inject(UpdatePartnerMenuItemUseCase) private readonly updatePartnerMenuItemUseCase: UpdatePartnerMenuItemUseCase,
    @Inject(DeletePartnerMenuItemUseCase) private readonly deletePartnerMenuItemUseCase: DeletePartnerMenuItemUseCase,
    @Inject(GetCategoriesUseCase) private readonly getCategoriesUseCase: GetCategoriesUseCase,
    @Inject(GetTagsUseCase) private readonly getTagsUseCase: GetTagsUseCase,
  ) {}

  // --- Partner (Merchant) Endpoints ---

  @Get('partner/my-restaurant')
  @UseGuards(JwtAuthGuard)
  getMyRestaurant(@CurrentUser() user: JwtPayload) {
    return this.getPartnerRestaurantUseCase.execute({ ownerId: user.id });
  }

  @Patch('partner/my-restaurant/status')
  @UseGuards(JwtAuthGuard)
  updateMyRestaurantStatus(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRestaurantStatusDto,
  ) {
    return this.updatePartnerRestaurantStatusUseCase.execute({
      ownerId: user.id,
      isActive: dto.is_active,
    });
  }

  @Patch('partner/my-restaurant/profile')
  @UseGuards(JwtAuthGuard)
  updateMyRestaurantProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRestaurantProfileDto,
  ) {
    return this.updatePartnerRestaurantProfileUseCase.execute({
      ownerId: user.id,
      dto,
    });
  }

  @Get('partner/my-restaurant/menu-items')
  @UseGuards(JwtAuthGuard)
  async getMyMenuItems(@CurrentUser() user: JwtPayload) {
    const data = await this.getPartnerRestaurantUseCase.execute({ ownerId: user.id });
    return data.menuItems;
  }

  @Post('partner/my-restaurant/menu-items')
  @UseGuards(JwtAuthGuard)
  createMyMenuItem(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePartnerMenuItemDto,
  ) {
    return this.createPartnerMenuItemUseCase.execute({
      ownerId: user.id,
      dto,
    });
  }

  @Patch('partner/my-restaurant/menu-items/:itemId')
  @UseGuards(JwtAuthGuard)
  updateMyMenuItem(
    @CurrentUser() user: JwtPayload,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdatePartnerMenuItemDto,
  ) {
    return this.updatePartnerMenuItemUseCase.execute({
      ownerId: user.id,
      itemId,
      dto,
    });
  }

  @Delete('partner/my-restaurant/menu-items/:itemId')
  @UseGuards(JwtAuthGuard)
  deleteMyMenuItem(
    @CurrentUser() user: JwtPayload,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.deletePartnerMenuItemUseCase.execute({
      ownerId: user.id,
      itemId,
    });
  }

  // --- Metadata Endpoints ---

  @Get('categories')
  getCategories() {
    return this.getCategoriesUseCase.execute();
  }

  @Get('tags')
  getTags() {
    return this.getTagsUseCase.execute();
  }

  // --- General Restaurant Endpoints ---

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

