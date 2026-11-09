import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { SingleflightService } from '@/common/cache/singleflight.service.js';
import { shouldXFetch } from '@/common/cache/xfetch.util.js';

export interface CacheEntry<T> {
  data: T;
  deltaMs: number;
  createdAt: number;
  ttlSeconds: number;
}

export interface CacheStampedeOptions {
  ttlSeconds?: number;
  beta?: number; // Hệ số quyết liệt XFetch (> 0, mặc định 1.0)
  forceRefresh?: boolean;
}

@Injectable()
export class CacheStampedeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheStampedeService.name);
  private client: RedisClientType | null = null;
  private readonly memoryCache = new Map<string, { entry: CacheEntry<unknown>; expiresAt: number }>();

  constructor(
    @Inject(SingleflightService) private readonly singleflight: SingleflightService,
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
  ) { }

  async onModuleInit(): Promise<void> {
    const host = this.configService?.get<string>('redis.host') || process.env.REDIS_HOST;
    const port = this.configService?.get<number>('redis.port') || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined);
    const redisUrl = process.env.REDIS_URL || (host && port ? `redis://${host}:${port}` : undefined);

    if (redisUrl) {
      try {
        this.client = createClient({ url: redisUrl });
        this.client.on('error', (err: unknown) => {
          this.logger.warn(`Redis client error in CacheStampedeService: ${String(err)}`);
        });
        await this.client.connect();
        this.logger.log(`CacheStampedeService connected to Redis at ${redisUrl}`);
      } catch (error: unknown) {
        this.logger.warn(`Could not connect to Redis for CacheStampedeService, fallback to in-memory: ${String(error)}`);
        this.client = null;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => { });
      this.client = null;
    }
    this.memoryCache.clear();
  }

  /**
   * Lấy dữ liệu từ cache hoặc gọi fetcher dưới sự bảo vệ của Singleflight & XFetch
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheStampedeOptions,
  ): Promise<T> {
    const ttlSeconds = options?.ttlSeconds ?? 60;
    const beta = options?.beta ?? 1.0;
    const forceRefresh = options?.forceRefresh ?? false;

    // 1. Kiểm tra cache
    if (!forceRefresh) {
      const cached = await this.getCacheEntry<T>(key);
      if (cached) {
        const ttlRemaining = await this.getRemainingTtl(key, cached.entry);

        // Đánh giá thuật toán XFetch (Early Expiration)
        if (shouldXFetch(cached.entry.deltaMs, beta, ttlRemaining)) {
          this.logger.debug(`[XFetch Triggered] Key ${key} will be refreshed in background (TTL remaining: ${ttlRemaining}s)`);
          // Làm mới ngầm bằng Singleflight (Non-blocking)
          void this.refreshInBackground(key, fetcher, ttlSeconds);
        }

        // Luôn trả về dữ liệu cache tức thì (0ms latency cho người dùng)
        return cached.entry.data;
      }
    }

    // 2. Cache Miss hoặc Buộc làm mới -> Gộp request bằng Singleflight
    this.logger.debug(`[Cache Miss / Singleflight] Fetching data for key: ${key}`);
    const result = await this.singleflight.do(key, async () => {
      const startTime = Date.now();
      const freshData = await fetcher();
      const deltaMs = Date.now() - startTime;

      await this.setCacheEntry(key, freshData, deltaMs, ttlSeconds);
      return freshData;
    });

    return result.data;
  }

  /**
   * Xóa một key khỏi cache (ví dụ khi nhà hàng cập nhật món)
   */
  async delete(key: string): Promise<void> {
    if (this.client) {
      try {
        await this.client.del(key);
      } catch (error: unknown) {
        this.logger.error(`Failed to delete cache key ${key}: ${String(error)}`);
      }
    }
    this.memoryCache.delete(key);
  }

  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.singleflight.do(key, async () => {
        const startTime = Date.now();
        const freshData = await fetcher();
        const deltaMs = Date.now() - startTime;

        await this.setCacheEntry(key, freshData, deltaMs, ttlSeconds);
        return freshData;
      });
    } catch (err: unknown) {
      this.logger.warn(`Background refresh failed for key ${key}: ${String(err)}`);
    }
  }

  private async getCacheEntry<T>(key: string): Promise<{ entry: CacheEntry<T> } | null> {
    if (this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw) {
          return { entry: JSON.parse(raw) as CacheEntry<T> };
        }
      } catch (error: unknown) {
        this.logger.error(`Error reading cache key ${key}: ${String(error)}`);
      }
    }

    // In-memory fallback
    const memItem = this.memoryCache.get(key);
    if (memItem) {
      if (memItem.expiresAt > Date.now()) {
        return { entry: memItem.entry as CacheEntry<T> };
      }
      this.memoryCache.delete(key);
    }

    return null;
  }

  private async setCacheEntry<T>(
    key: string,
    data: T,
    deltaMs: number,
    ttlSeconds: number,
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      deltaMs,
      createdAt: Date.now(),
      ttlSeconds,
    };

    if (this.client) {
      try {
        await this.client.set(key, JSON.stringify(entry), { EX: ttlSeconds });
        return;
      } catch (error: unknown) {
        this.logger.error(`Error setting cache key ${key}: ${String(error)}`);
      }
    }

    // In-memory fallback
    this.memoryCache.set(key, {
      entry: entry as CacheEntry<unknown>,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private async getRemainingTtl(key: string, entry: CacheEntry<unknown>): Promise<number> {
    if (this.client) {
      try {
        const ttl = await this.client.ttl(key);
        if (ttl > 0) return ttl;
      } catch {
        // Fallback below
      }
    }

    // Tính toán từ thời điểm tạo
    const elapsedSeconds = (Date.now() - entry.createdAt) / 1000;
    return Math.max(0, entry.ttlSeconds - elapsedSeconds);
  }
}

