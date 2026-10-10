import { Injectable, NotFoundException } from '@nestjs/common';
import { ValidateCartDto } from '@/modules/orders/dto/validate-cart.dto.js';

@Injectable()
export class ValidateCartUseCase {
  constructor() {}

  async execute(dto: ValidateCartDto) {
    const { restaurant_id, items } = dto;

    // Call restaurant-service internal API to fetch menu items
    const res = await fetch(http://localhost:3002/internal/restaurants/ + restaurant_id + /menu);
    if (!res.ok) {
      throw new NotFoundException('Restaurant not found or unavailable');
    }
    
    const menuItems = await res.json();
    const menuItemsMap = new Map(menuItems.map(m => [m.id, m]));

    const validatedItems = [];
    let subtotal = 0;

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
          price: Number(dbItem.price),
          is_available: false,
          error: 'Món ăn hiện đang tạm hết',
        });
        continue;
      }

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
