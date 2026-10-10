import { Injectable, BadRequestException } from '@nestjs/common';
import { ValidateCartDto } from '@/modules/orders/dto/validate-cart.dto.js';

@Injectable()
export class ValidateCartUseCase {
  constructor() {}

  async execute(dto: ValidateCartDto): Promise<any> {
    const { items, restaurant_id } = dto;
    
    // Fetch menu items from restaurant-service via internal API
    const res = await fetch(`http://localhost:3002/internal/restaurants/${restaurant_id}/menu`);
    if (!res.ok) {
      throw new BadRequestException('Restaurant not found or internal server error');
    }
    const menuItems: any[] = await res.json();
    const menuItemsMap = new Map<string, any>(menuItems.map(m => [m.id, m]));

    let totalAmount = 0;
    const validatedItems = [];
    const invalidItems = [];

    for (const item of items) {
      const dbItem = menuItemsMap.get(item.item_id);
      
      if (!dbItem) {
        invalidItems.push({ menu_item_id: item.item_id, reason: 'Item not found' });
        continue;
      }

      if (!dbItem.is_available) {
        invalidItems.push({ 
          menu_item_id: item.item_id, 
          reason: 'Item is out of stock',
          price: Number(dbItem.price),
          name: dbItem.name 
        });
        continue;
      }

      const price = Number(dbItem.price);
      totalAmount += price * item.quantity;
      validatedItems.push({
        menu_item_id: item.item_id,
        quantity: item.quantity,
        price,
        name: dbItem.name,
      });
    }

    return {
      isValid: invalidItems.length === 0,
      totalAmount,
      validatedItems,
      invalidItems,
    };
  }
}

