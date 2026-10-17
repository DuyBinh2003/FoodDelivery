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
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
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
}
