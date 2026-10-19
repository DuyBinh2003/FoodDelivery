import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface DriverLocationData {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  remaining_km?: number | null;
  eta_minutes?: number | null;
  updatedAt: string;
}

@Injectable()
export class DriverLocationRedisRepository implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(DriverLocationRedisRepository.name);
  private readonly ORDER_LOCATION_PREFIX = 'driver:location:order:';
  private readonly DRIVER_LOCATION_PREFIX = 'driver:location:driver:';
  private readonly DEFAULT_TTL = 3600; // 1 hour

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host') || process.env.REDIS_HOST || 'localhost';
    const port = this.configService.get<number>('redis.port') || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379);
    const redisUrl = `redis://${host}:${port}`;
    this.client = createClient({ url: redisUrl }) as RedisClientType;
  }

  async onModuleInit(): Promise<void> {
    try {
      this.client.on('error', (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Redis Client Error in DriverLocationRedisRepository: ${message}`);
      });
      await this.client.connect();
      this.logger.log('Connected to Redis for Driver Tracking successfully');
    } catch (error: unknown) {
      this.logger.error('Failed to connect to Redis for Driver Tracking:', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.disconnect();
      this.logger.log('Disconnected from Redis for Driver Tracking');
    }
  }

  async saveOrderDriverLocation(
    orderId: string,
    locationData: DriverLocationData,
    ttlSeconds: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      const key = `${this.ORDER_LOCATION_PREFIX}${orderId}`;
      await this.client.set(key, JSON.stringify(locationData), { EX: ttlSeconds });
      
      const driverKey = `${this.DRIVER_LOCATION_PREFIX}${locationData.driverId}`;
      await this.client.set(driverKey, JSON.stringify(locationData), { EX: ttlSeconds });
    } catch (error: unknown) {
      this.logger.error(`Failed to save driver location for order ${orderId}:`, error);
      throw error;
    }
  }

  async getOrderDriverLocation(orderId: string): Promise<DriverLocationData | null> {
    try {
      const key = `${this.ORDER_LOCATION_PREFIX}${orderId}`;
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as DriverLocationData;
    } catch (error: unknown) {
      this.logger.error(`Failed to get driver location for order ${orderId}:`, error);
      return null;
    }
  }

  async getDriverCurrentLocation(driverId: string): Promise<DriverLocationData | null> {
    try {
      const key = `${this.DRIVER_LOCATION_PREFIX}${driverId}`;
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as DriverLocationData;
    } catch (error: unknown) {
      this.logger.error(`Failed to get driver location for driver ${driverId}:`, error);
      return null;
    }
  }
}
