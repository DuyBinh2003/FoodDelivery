import { Injectable, BadRequestException } from '@nestjs/common';
import { ValidateCartDto } from '@/modules/orders/dto/validate-cart.dto.js';

export interface ValidatedCartItem {
  item_id: string;
  quantity: number;
  price: number;
  name: string;
}

export interface InvalidCartItem {
  item_id?: string;
  reason: string;
  price?: number;
  name?: string;
}

export interface ValidateCartResponse {
  isValid: boolean;
  totalAmount: number;
  validatedItems: ValidatedCartItem[];
  invalidItems: InvalidCartItem[];
  reason?: string;
}

interface InternalMenuItem {
  id: string;
  name: string;
  price: number | string;
  is_available: boolean;
}

@Injectable()
export class ValidateCartUseCase {
  constructor() {}

  async execute(dto: ValidateCartDto): Promise<ValidateCartResponse> {
    const { items, restaurant_id } = dto;
    const restaurantUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';

    // 1. Check restaurant status (is_active)
    try {
      const statusRes = await fetch(`${restaurantUrl}/internal/restaurants/${restaurant_id}/status`);
      if (statusRes.ok) {
        const restData = (await statusRes.json()) as { id: string; name: string; is_active: boolean };
        if (!restData.is_active) {
          return {
            isValid: false,
            totalAmount: 0,
            validatedItems: [],
            invalidItems: [{ reason: `Nhà hàng "${restData.name}" hiện đang tạm đóng cửa, không nhận đơn đặt món.` }],
            reason: `Nhà hàng "${restData.name}" hiện đang tạm đóng cửa.`,
          };
        }
      }
    } catch (err) {
      console.warn('[ValidateCartUseCase] Unable to check restaurant status:', err);
    }

    // 2. Fetch menu items from restaurant-service via internal API
    const res = await fetch(`${restaurantUrl}/internal/restaurants/${restaurant_id}/menu`);
    if (!res.ok) {
      throw new BadRequestException('Restaurant not found or internal server error');
    }
    const menuItems = (await res.json()) as InternalMenuItem[];
    const menuItemsMap = new Map<string, InternalMenuItem>(menuItems.map((m) => [m.id, m]));

    let totalAmount = 0;
    const validatedItems: ValidatedCartItem[] = [];
    const invalidItems: InvalidCartItem[] = [];

    for (const item of items) {
      const dbItem = menuItemsMap.get(item.item_id);

      if (!dbItem) {
        invalidItems.push({ item_id: item.item_id, reason: 'Item not found' });
        continue;
      }

      if (!dbItem.is_available) {
        invalidItems.push({
          item_id: item.item_id,
          reason: 'Item is out of stock',
          price: Number(dbItem.price),
          name: dbItem.name,
        });
        continue;
      }

      const price = Number(dbItem.price);
      totalAmount += price * item.quantity;
      validatedItems.push({
        item_id: item.item_id,
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
