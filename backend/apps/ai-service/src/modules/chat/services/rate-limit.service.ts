import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType | null = null;
  private readonly logger = new Logger(RateLimitService.name);
  private isConnected = false;
  private readonly limit: number;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.limit = this.configService.get<number>('ai.rateLimitPerMinute') || 20;

    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    const redisUrl = `redis://${host}:${port}`;

    try {
      this.client = createClient({ url: redisUrl }) as RedisClientType;
      this.client.on('error', (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Redis RateLimit client error: ${msg}`);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to initialize Redis client: ${msg}`);
    }
  }

  setClient(injectedClient: RedisClientType): void {
    this.client = injectedClient;
    this.isConnected = true;
  }

  async onModuleInit(): Promise<void> {
    if (this.client && !this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
        this.logger.log('RateLimitService connected to Redis');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Could not connect to Redis for RateLimiting: ${msg}`);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.isConnected && this.client.isOpen) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Enforces 20 requests per minute per user
   */
  async checkRateLimit(userId: string): Promise<void> {
    if (!this.client || !this.isConnected) {
      // Graceful fallback if Redis is down
      return;
    }

    const currentMinute = Math.floor(Date.now() / 60000);
    const key = `ai:ratelimit:${userId}:${currentMinute}`;

    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, 65); // 65 seconds to clear window
      }

      if (current > this.limit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Bạn đã vượt quá giới hạn ${this.limit} tin nhắn/phút. Vui lòng thử lại sau.`,
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err: unknown) {
      if (err instanceof HttpException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Rate limit check failed, allowing request: ${msg}`);
    }
  }
}
