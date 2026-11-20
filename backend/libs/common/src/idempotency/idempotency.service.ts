import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export interface IdempotentResponse {
  statusCode: number;
  body: unknown;
  savedAt: string;
}

export interface AcquireLockResult {
  acquired: boolean;
  cachedResponse?: IdempotentResponse;
}

@Injectable()
export class IdempotencyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyService.name);
  private client: RedisClientType | null = null;
  private readonly memoryLocks = new Map<string, number>();
  private readonly memoryCache = new Map<string, { data: IdempotentResponse; expiresAt: number }>();

  constructor(
    @Optional() @Inject(ConfigService) private readonly configService?: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService?.get<string>('redis.host') || process.env.REDIS_HOST;
    const port = this.configService?.get<number>('redis.port') || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined);
    const redisUrl = process.env.REDIS_URL || (host && port ? `redis://${host}:${port}` : undefined);

    if (redisUrl) {
      try {
        this.client = createClient({ url: redisUrl });
        this.client.on('error', (err: unknown) => {
          this.logger.warn(`Redis client error in IdempotencyService: ${String(err)}`);
        });
        await this.client.connect();
        this.logger.log(`IdempotencyService connected to Redis at ${redisUrl}`);
      } catch (error: unknown) {
        this.logger.warn(`Could not connect to Redis for idempotency, falling back to in-memory: ${String(error)}`);
        this.client = null;
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.client = null;
    }
    this.memoryLocks.clear();
    this.memoryCache.clear();
  }

  /**
   * Thử giành quyền xử lý (Distributed Mutex Lock).
   * Nếu đã có cache từ trước: trả về cachedResponse.
   * Nếu đang bị lock bởi request khác: trả về acquired = false.
   * Nếu lấy lock thành công: trả về acquired = true.
   */
  async acquireLock(key: string, lockTtlSeconds = 120): Promise<AcquireLockResult> {
    const cached = await this.getCachedResponse(key);
    if (cached) {
      return { acquired: false, cachedResponse: cached };
    }

    const lockKey = `idempotency:lock:${key}`;

    if (this.client) {
      try {
        const result = await this.client.set(lockKey, 'LOCKED', {
          NX: true,
          EX: lockTtlSeconds,
        });
        return { acquired: result === 'OK' };
      } catch (error: unknown) {
        this.logger.error(`Redis acquireLock error for key ${key}: ${String(error)}`);
        // Fallback to in-memory on redis failure
      }
    }

    // In-memory fallback
    const now = Date.now();
    const existingLockExpire = this.memoryLocks.get(lockKey);
    if (existingLockExpire && existingLockExpire > now) {
      return { acquired: false };
    }

    this.memoryLocks.set(lockKey, now + lockTtlSeconds * 1000);
    return { acquired: true };
  }

  /**
   * Lưu kết quả response của request gốc và giải phóng lock.
   */
  async saveResponse(key: string, statusCode: number, body: unknown, cacheTtlSeconds = 86400): Promise<void> {
    const responsePayload: IdempotentResponse = {
      statusCode,
      body,
      savedAt: new Date().toISOString(),
    };

    const resKey = `idempotency:res:${key}`;
    const lockKey = `idempotency:lock:${key}`;

    if (this.client) {
      try {
        await this.client.set(resKey, JSON.stringify(responsePayload), {
          EX: cacheTtlSeconds,
        });
        await this.client.del(lockKey);
        return;
      } catch (error: unknown) {
        this.logger.error(`Redis saveResponse error for key ${key}: ${String(error)}`);
      }
    }

    // In-memory fallback
    this.memoryCache.set(resKey, {
      data: responsePayload,
      expiresAt: Date.now() + cacheTtlSeconds * 1000,
    });
    this.memoryLocks.delete(lockKey);
  }

  /**
   * Giải phóng lock khi request bị lỗi/exception để không làm tắc nghẽn các lần gọi hợp lệ tiếp theo.
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `idempotency:lock:${key}`;
    if (this.client) {
      try {
        await this.client.del(lockKey);
        return;
      } catch (error: unknown) {
        this.logger.error(`Redis releaseLock error for key ${key}: ${String(error)}`);
      }
    }
    this.memoryLocks.delete(lockKey);
  }

  /**
   * Tra cứu cached response ban đầu nếu có.
   */
  async getCachedResponse(key: string): Promise<IdempotentResponse | null> {
    const resKey = `idempotency:res:${key}`;

    if (this.client) {
      try {
        const raw = await this.client.get(resKey);
        if (raw) {
          return JSON.parse(raw) as IdempotentResponse;
        }
        return null;
      } catch (error: unknown) {
        this.logger.error(`Redis getCachedResponse error for key ${key}: ${String(error)}`);
      }
    }

    // In-memory fallback
    const item = this.memoryCache.get(resKey);
    if (item) {
      if (item.expiresAt > Date.now()) {
        return item.data;
      }
      this.memoryCache.delete(resKey);
    }

    return null;
  }
}

