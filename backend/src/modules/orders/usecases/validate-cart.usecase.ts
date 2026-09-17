import { Injectable, NotFoundException } from '@nestjs/common';
import { ValidateCartDto } from '@/modules/orders/dto/validate-cart.dto.js';
import { RestaurantReadRepository } from '@/modules/restaurants/repositories/restaurant.read.repository.js';

@Injectable()
export class ValidateCartUseCase {
  constructor(
    private readonly restaurantReadRepo: RestaurantReadRepository,
  ) {}

  async execute(dto: ValidateCartDto) {
    const { restaurant_id, items } = dto;

    // Verify restaurant exists
    const restaurant = await this.restaurantReadRepo.findById(restaurant_id);
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const validatedItems = [];
    let subtotal = 0;

    // We can fetch all menu items of this restaurant to avoid N+1 queries
    // In a real high-scale app, we might use Redis to cache these menu items
    const menuItems = await this.restaurantReadRepo.findMenuItems(restaurant_id);
    const menuItemsMap = new Map(menuItems.map(m => [m.id, m]));

    for (const cartItem of items) {
      const dbItem = menuItemsMap.get(cartItem.item_id);
      
      if (!dbItem) {
        validatedItems.push({
          ...cartItem,
          is_available: false,
          error: 'Món ăn không tồn tại hoặc đã bị xóa',
        });
        continue;
      }

      if (!dbItem.is_available) {
        validatedItems.push({
          ...cartItem,
          price: Number(dbItem.price), // ensure it's a number
          is_available: false,
          error: 'Món ăn hiện đang tạm hết',
        });
        continue;
      }

      // Valid item
      const price = Number(dbItem.price);
      subtotal += price * cartItem.quantity;
      
      validatedItems.push({
        ...cartItem,
        price,
        is_available: true,
      });
    }

    return {
      restaurant_id,
      subtotal,
      items: validatedItems,
    };
  }
}
