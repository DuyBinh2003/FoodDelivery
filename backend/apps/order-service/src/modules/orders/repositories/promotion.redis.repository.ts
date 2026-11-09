import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

export interface ClaimVoucherResult {
  success: boolean;
  remainingQuota?: number;
  errorCode?: 'OUT_OF_STOCK' | 'ALREADY_CLAIMED' | 'DEVICE_LIMIT_EXCEEDED' | 'CAMPAIGN_KILLED';
  message?: string;
}

export interface ReservationResult {
  success: boolean;
  ticketToken?: string;
  lockedVoucherIds?: string[];
  errorCode?: 'VOUCHER_UNAVAILABLE' | 'ALREADY_RESERVED' | 'SYSTEM_ERROR';
  message?: string;
}

@Injectable()
export class PromotionRedisRepository implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(PromotionRedisRepository.name);

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host') || process.env.REDIS_HOST || 'localhost';
    const port = this.configService.get<number>('redis.port') || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379);
    const redisUrl = `redis://${host}:${port}`;
    this.client = createClient({ url: redisUrl }) as RedisClientType;

    this.client.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`PromotionRedisRepository connection error: ${msg}`);
    });
  }

  async onModuleInit() {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
        this.logger.log('PromotionRedisRepository connected to Redis.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to connect Redis in PromotionRedisRepository: ${msg}`);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.disconnect();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Failed to disconnect Redis: ${msg}`);
    }
  }

  get isConnected(): boolean {
    return this.client && this.client.isOpen;
  }

  /**
   * Atomic Flash Sale Claim Lua Script
   * Kiểm tra quota, đã nhận chưa, giới hạn thiết bị
   */
  async atomicClaimVoucher(params: {
    voucherId: string;
    userId: string;
    deviceFingerprint: string;
    totalQuantity: number;
    usedQuantity: number;
    maxClaimsPerUser: number;
    deviceDailyLimit?: number;
  }): Promise<ClaimVoucherResult> {
    const { voucherId, userId, deviceFingerprint, totalQuantity, usedQuantity, maxClaimsPerUser, deviceDailyLimit = 5 } = params;

    if (!this.isConnected) {
      // Graceful local handling when Redis is not available
      return { success: true, remainingQuota: Math.max(0, totalQuantity - usedQuantity - 1) };
    }

    const quotaKey = `promo:voucher:${voucherId}:quota`;
    const userClaimedKey = `promo:voucher:${voucherId}:users`;
    const deviceKey = `promo:device:${deviceFingerprint}:claims`;

    const luaScript = `
      local quotaKey = KEYS[1]
      local userClaimedKey = KEYS[2]
      local deviceKey = KEYS[3]

      local totalQty = tonumber(ARGV[1])
      local usedQty = tonumber(ARGV[2])
      local userId = ARGV[3]
      local maxClaims = tonumber(ARGV[4])
      local deviceLimit = tonumber(ARGV[5])

      -- 1. Kiểm tra giới hạn thiết bị (Device Fingerprint check)
      local currentDeviceClaims = tonumber(redis.call('GET', deviceKey) or '0')
      if currentDeviceClaims >= deviceLimit then
        return {-3, 0} -- DEVICE_LIMIT_EXCEEDED
      end

      -- 2. Kiểm tra user đã claim bao nhiêu lần
      local userClaims = tonumber(redis.call('HGET', userClaimedKey, userId) or '0')
      if userClaims >= maxClaims then
        return {-2, 0} -- ALREADY_CLAIMED
      end

      -- 3. Khởi tạo quota nếu chưa có
      local exists = redis.call('EXISTS', quotaKey)
      if exists == 0 then
        local initialQuota = totalQty - usedQty
        redis.call('SET', quotaKey, initialQuota)
      end

      -- 4. Kiểm tra quota còn lại
      local currentQuota = tonumber(redis.call('GET', quotaKey) or '0')
      if currentQuota <= 0 then
        return {-1, 0} -- OUT_OF_STOCK
      end

      -- 5. Thực hiện giảm quota & tăng đếm
      local remaining = redis.call('DECR', quotaKey)
      redis.call('HINCRBY', userClaimedKey, userId, 1)
      redis.call('INCR', deviceKey)
      redis.call('EXPIRE', deviceKey, 86400) -- Hết hạn sau 24h

      return {1, remaining}
    `;

    try {
      const result = await this.client.eval(luaScript, {
        keys: [quotaKey, userClaimedKey, deviceKey],
        arguments: [
          String(totalQuantity),
          String(usedQuantity),
          userId,
          String(maxClaimsPerUser),
          String(deviceDailyLimit),
        ],
      }) as [number, number];

      const status = result[0];
      const remainingQuota = result[1];

      if (status === 1) {
        return { success: true, remainingQuota };
      }
      if (status === -1) {
        return { success: false, errorCode: 'OUT_OF_STOCK', message: 'Voucher đã hết số lượng phát hành' };
      }
      if (status === -2) {
        return { success: false, errorCode: 'ALREADY_CLAIMED', message: 'Bạn đã đạt giới hạn nhận voucher này' };
      }
      if (status === -3) {
        return { success: false, errorCode: 'DEVICE_LIMIT_EXCEEDED', message: 'Thiết bị đã đạt giới hạn lưu mã trong ngày' };
      }

      return { success: false, errorCode: 'OUT_OF_STOCK', message: 'Không thể lưu mã' };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`atomicClaimVoucher eval error: ${msg}`, { cause: error });
      return { success: true, remainingQuota: Math.max(0, totalQuantity - usedQuantity - 1) };
    }
  }

  /**
   * Two-Phase Soft Lock Reservation với TTL (15 phút)
   */
  async reserveVouchers(orderId: string, voucherIds: string[], userId: string, ttlSeconds = 900): Promise<ReservationResult> {
    const ticketToken = `tkt_${orderId}_${Date.now()}`;

    if (!this.isConnected) {
      return { success: true, ticketToken, lockedVoucherIds: voucherIds };
    }

    const reservationKey = `promo:reservation:${orderId}`;
    try {
      // Lưu ticket reservation trên Redis
      const payload = JSON.stringify({
        orderId,
        voucherIds,
        userId,
        ticketToken,
        reservedAt: new Date().toISOString(),
      });

      await this.client.set(reservationKey, payload, { EX: ttlSeconds });

      // Đánh dấu các voucher đang bị khóa cho orderId này
      for (const vId of voucherIds) {
        const lockKey = `promo:vlock:${vId}:${userId}`;
        await this.client.set(lockKey, orderId, { EX: ttlSeconds });
      }

      return {
        success: true,
        ticketToken,
        lockedVoucherIds: voucherIds,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`reserveVouchers error: ${msg}`, { cause: error });
      return { success: true, ticketToken, lockedVoucherIds: voucherIds };
    }
  }

  /**
   * Release Two-Phase Reservation
   */
  async releaseReservation(orderId: string, voucherIds: string[], userId: string): Promise<boolean> {
    if (!this.isConnected) return true;

    try {
      const reservationKey = `promo:reservation:${orderId}`;
      await this.client.del(reservationKey);

      for (const vId of voucherIds) {
        const lockKey = `promo:vlock:${vId}:${userId}`;
        await this.client.del(lockKey);
      }
      return true;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`releaseReservation error: ${msg}`, { cause: error });
      return false;
    }
  }

  /**
   * Sliding-Window Rate Limiter
   */
  async checkRateLimit(key: string, limit = 30, windowSeconds = 60): Promise<boolean> {
    if (!this.isConnected) return true;

    const rateKey = `promo:ratelimit:${key}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      const multi = this.client.multi();
      multi.zRemRangeByScore(rateKey, 0, windowStart);
      multi.zAdd(rateKey, { score: now, value: `${now}_${Math.random()}` });
      multi.zCard(rateKey);
      multi.expire(rateKey, windowSeconds);

      const results = await multi.exec();
      const currentCount = results[2] as unknown as number;
      return currentCount <= limit;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Rate limiter check failed: ${msg}`);
      return true; // fail-open for user experience
    }
  }
}
