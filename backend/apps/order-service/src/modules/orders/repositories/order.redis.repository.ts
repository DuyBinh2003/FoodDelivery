import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { OrderStatus } from '@/modules/orders/entities/order.entity.js';

export interface InflightOrderItem {
  id?: string;
  menu_item_id: string;
  name?: string;
  quantity: number;
  unit_price: number;
}

export interface InflightOrderData {
  id: string;
  customer_id: string;
  restaurant_id: string;
  restaurant_name?: string;
  driver_id: string | null;
  status: OrderStatus;
  delivery_address: string;
  note: string | null;
  payment_method: string;
  total_amount: number;
  items: InflightOrderItem[];
  created_at: string;
  updated_at: string;
}

@Injectable()
export class OrderRedisRepository implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(OrderRedisRepository.name);
  private readonly KEY_PREFIX = 'order:inflight:';
  private readonly DEFAULT_TTL = 86400; // 24 hours

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('redis.host');
    const port = this.configService.getOrThrow<number>('redis.port');
    this.client = createClient({ url: `redis://${host}:${port}` }) as RedisClientType;

    this.client.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis connection error: ${msg}`);
    });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('OrderRedisRepository connected to Redis successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to connect to Redis: ${msg}`);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Error disconnecting from Redis: ${msg}`);
    }
  }

  private getKey(orderId: string): string {
    return `${this.KEY_PREFIX}${orderId}`;
  }

  async saveInflightOrder(orderId: string, orderData: InflightOrderData, ttlSeconds = this.DEFAULT_TTL): Promise<void> {
    const key = this.getKey(orderId);
    await this.client.set(key, JSON.stringify(orderData), { EX: ttlSeconds });
  }

  async getInflightOrder(orderId: string): Promise<InflightOrderData | null> {
    const key = this.getKey(orderId);
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as InflightOrderData;
    } catch {
      return null;
    }
  }

  async updateStatus(
    orderId: string,
    status: OrderStatus,
    extra?: Partial<InflightOrderData>,
  ): Promise<InflightOrderData | null> {
    const order = await this.getInflightOrder(orderId);
    if (!order) return null;

    const updated: InflightOrderData = {
      ...order,
      ...extra,
      status,
      updated_at: new Date().toISOString(),
    };

    await this.saveInflightOrder(orderId, updated);
    return updated;
  }

  async setTtl(orderId: string, seconds: number): Promise<void> {
    const key = this.getKey(orderId);
    await this.client.expire(key, seconds);
  }

  async deleteInflightOrder(orderId: string): Promise<void> {
    const key = this.getKey(orderId);
    await this.client.del(key);
  }

  async getCustomerInflightOrders(customerId: string): Promise<InflightOrderData[]> {
    try {
      const keys = await this.client.keys(`${this.KEY_PREFIX}*`);
      if (!keys || keys.length === 0) return [];

      const orders: InflightOrderData[] = [];
      for (const key of keys) {
        const raw = await this.client.get(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as InflightOrderData;
            if (parsed.customer_id === customerId) {
              orders.push(parsed);
            }
          } catch {
            // Ignore corrupted json
          }
        }
      }
      return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to scan customer inflight orders: ${msg}`);
      return [];
    }
  }

  async getRestaurantInflightOrders(restaurantId: string): Promise<InflightOrderData[]> {
    try {
      const keys = await this.client.keys(`${this.KEY_PREFIX}*`);
      if (!keys || keys.length === 0) return [];

      const orders: InflightOrderData[] = [];
      for (const key of keys) {
        const raw = await this.client.get(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as InflightOrderData;
            if (parsed.restaurant_id === restaurantId) {
              orders.push(parsed);
            }
          } catch {
            // Ignore corrupted json
          }
        }
      }
      return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to scan restaurant inflight orders: ${msg}`);
      return [];
    }
  }

  async getDriverInflightOrders(driverId: string): Promise<InflightOrderData[]> {
    try {
      const keys = await this.client.keys(`${this.KEY_PREFIX}*`);
      if (!keys || keys.length === 0) return [];

      const orders: InflightOrderData[] = [];
      for (const key of keys) {
        const raw = await this.client.get(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as InflightOrderData;
            if (parsed.driver_id === driverId) {
              orders.push(parsed);
            }
          } catch {
            // Ignore corrupted json
          }
        }
      }
      return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to scan driver inflight orders: ${msg}`);
      return [];
    }
  }

  async getAvailablePickupOrders(): Promise<InflightOrderData[]> {
    try {
      const keys = await this.client.keys(`${this.KEY_PREFIX}*`);
      if (!keys || keys.length === 0) return [];

      const orders: InflightOrderData[] = [];
      for (const key of keys) {
        const raw = await this.client.get(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as InflightOrderData;
            if (
              (parsed.status === OrderStatus.READY_FOR_PICKUP || parsed.status === OrderStatus.ACCEPTED) &&
              (!parsed.driver_id || parsed.driver_id === '')
            ) {
              orders.push(parsed);
            }
          } catch {
            // Ignore corrupted json
          }
        }
      }
      return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to scan available pickup orders: ${msg}`);
      return [];
    }
  }

  async claimOrder(
    orderId: string,
    driverId: string,
  ): Promise<{ success: boolean; order?: InflightOrderData; error?: 'NOT_FOUND' | 'CONFLICT' }> {
    const key = this.getKey(orderId);
    const now = new Date().toISOString();

    const luaScript = `
      local key = KEYS[1]
      local driverId = ARGV[1]
      local now = ARGV[2]
      local data = redis.call('GET', key)
      if not data then
        return 'NOT_FOUND'
      end
      local order = cjson.decode(data)
      if (order.status == 'READY_FOR_PICKUP' or order.status == 'ACCEPTED') and (not order.driver_id or order.driver_id == '') then
        order.driver_id = driverId
        order.status = 'DELIVERING'
        order.updated_at = now
        local updatedData = cjson.encode(order)
        local ttl = redis.call('TTL', key)
        if ttl > 0 then
          redis.call('SET', key, updatedData, 'EX', ttl)
        else
          redis.call('SET', key, updatedData)
        end
        return updatedData
      else
        return 'CONFLICT'
      end
    `;

    try {
      const result = await this.client.eval(luaScript, {
        keys: [key],
        arguments: [driverId, now],
      });

      if (result === 'NOT_FOUND') {
        return { success: false, error: 'NOT_FOUND' };
      }
      if (result === 'CONFLICT') {
        return { success: false, error: 'CONFLICT' };
      }

      if (typeof result === 'string') {
        return { success: true, order: JSON.parse(result) as InflightOrderData };
      }
      return { success: false, error: 'CONFLICT' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error executing claimOrder lua script: ${msg}`);
      throw err;
    }
  }
}
