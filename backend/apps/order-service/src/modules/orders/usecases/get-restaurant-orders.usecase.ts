import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderRedisRepository } from '@/modules/orders/repositories/order.redis.repository.js';
import { OrderReadRepository } from '@/modules/orders/repositories/order.read.repository.js';

export interface RestaurantOrderDto {
  id: string;
  customer_id: string;
  restaurant_id: string;
  driver_id: string | null;
  subtotal?: number;
  delivery_fee?: number;
  total_amount: number;
  status: string;
  delivery_address: string;
  note: string | null;
  cooking_at?: Date | null;
  ready_at?: Date | null;
  driver_claimed_at?: Date | null;
  completed_at?: Date | null;
  cancelled_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  items: Array<{
    id?: string;
    menu_item_id: string;
    name?: string;
    quantity: number;
    unit_price: number;
    options?: string[];
    notes?: string;
  }>;
}

@Injectable()
export class GetRestaurantOrdersUseCase {
  private readonly logger = new Logger(GetRestaurantOrdersUseCase.name);

  constructor(
    @Inject(OrderRedisRepository)
    private readonly orderRedisRepo: OrderRedisRepository,
    @Inject(OrderReadRepository)
    private readonly orderReadRepo: OrderReadRepository,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async execute(params: { restaurantId: string }): Promise<RestaurantOrderDto[]> {
    const { restaurantId } = params;

    // Cache menu item details from restaurant-service
    const restaurantUrl = this.configService.getOrThrow<string>('services.restaurantUrl');
    const menuMap = new Map<string, { id: string; name: string; price?: number; description?: string; image_url?: string }>();
    try {
      const res = await fetch(`${restaurantUrl}/internal/restaurants/${restaurantId}/menu`);
      if (res.ok) {
        const menuItems = await res.json().catch(() => []);
        if (Array.isArray(menuItems)) {
          menuItems.forEach((m) => {
            menuMap.set(m.id, m);
          });
        }
      } else {
        this.logger.warn(`Menu fetch returned status ${res.status} for restaurant ${restaurantId}`);
      }
    } catch (error: unknown) {
      this.logger.warn(`Failed to fetch menu items for restaurant ${restaurantId}:`, error);
    }

    // 1. Quét các đơn đang xử lý trên Redis (PENDING, COOKING, READY_FOR_PICKUP, DELIVERING)
    const inflightOrders = await this.orderRedisRepo.getRestaurantInflightOrders(restaurantId);

    // 2. Lấy các đơn đã lưu DB (COMPLETED, CANCELLED)
    const dbResult = await this.orderReadRepo.findWithFilters({
      restaurant_id: restaurantId,
      page: 1,
      limit: 50,
    });
    const dbOrders = dbResult.data;

    const inflightIds = new Set(inflightOrders.map((o) => o.id));
    const filteredDbOrders = dbOrders.filter((o) => !inflightIds.has(o.id));

    // Map inflight orders
    const mappedInflight: RestaurantOrderDto[] = inflightOrders.map((o) => {
      const totalNum = Number(o.total_amount) || 0;
      const subtotal = Number(o.subtotal) || (totalNum > 15000 ? totalNum - 15000 : totalNum);
      const deliveryFee = Number(o.delivery_fee) || 15000;
      return {
        id: o.id,
        customer_id: o.customer_id,
        restaurant_id: o.restaurant_id,
        driver_id: o.driver_id,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalNum,
        status: o.status,
        delivery_address: o.delivery_address,
        note: o.note,
        cooking_at: o.cooking_at ? new Date(o.cooking_at) : null,
        ready_at: o.ready_at ? new Date(o.ready_at) : null,
        driver_claimed_at: o.driver_claimed_at ? new Date(o.driver_claimed_at) : null,
        completed_at: o.completed_at ? new Date(o.completed_at) : null,
        cancelled_at: o.cancelled_at ? new Date(o.cancelled_at) : null,
        created_at: new Date(o.created_at),
        updated_at: new Date(o.updated_at),
        items: o.items.map((i) => ({
          id: i.id,
          menu_item_id: i.menu_item_id,
          name: i.name || menuMap.get(i.menu_item_id)?.name || 'Món ăn đặc sản',
          quantity: i.quantity,
          unit_price: Number(i.unit_price) || 0,
          options: (i as any).options,
          notes: (i as any).notes,
        })),
      };
    });

    // Map db orders
    const mappedDb: RestaurantOrderDto[] = filteredDbOrders.map((o) => {
      const totalNum = Number(o.total_amount) || 0;
      const subtotal = Number(o.subtotal) || (totalNum > 15000 ? totalNum - 15000 : totalNum);
      const deliveryFee = Number(o.delivery_fee) || 15000;
      return {
        id: o.id,
        customer_id: o.customer_id,
        restaurant_id: o.restaurant_id,
        driver_id: o.driver_id,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalNum,
        status: o.status,
        delivery_address: o.delivery_address,
        note: o.note,
        cooking_at: o.cooking_at ?? null,
        ready_at: o.ready_at ?? null,
        driver_claimed_at: o.driver_claimed_at ?? null,
        completed_at: o.completed_at ?? null,
        cancelled_at: o.cancelled_at ?? null,
        created_at: o.created_at,
        updated_at: o.updated_at,
        items: (o.items || []).map((i) => ({
          id: i.id,
          menu_item_id: i.menu_item_id,
          name: (i as any).name || menuMap.get(i.menu_item_id)?.name || 'Món ăn đặc sản',
          quantity: i.quantity,
          unit_price: Number(i.unit_price) || 0,
          options: (i as any).options,
          notes: (i as any).notes,
        })),
      };
    });

    return [...mappedInflight, ...mappedDb].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
}
