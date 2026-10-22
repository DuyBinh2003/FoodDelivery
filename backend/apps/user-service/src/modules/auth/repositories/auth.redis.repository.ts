import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

@Injectable()
export class AuthRedisRepository implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(AuthRedisRepository.name);
  private isConnected = false;

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    const redisUrl = `redis://${host}:${port}`;
    this.client = createClient({ url: redisUrl }) as RedisClientType;

    this.client.on('error', (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Redis Auth Client error: ${msg}`);
    });
  }

  /**
   * Allows injecting a mock or pre-configured Redis client (e.g. for testing)
   */
  setClient(injectedClient: RedisClientType): void {
    this.client = injectedClient;
    this.isConnected = true;
  }

  async onModuleInit() {
    if (!this.isConnected) {
      try {
        await this.client.connect();
        this.isConnected = true;
        this.logger.log('AuthRedisRepository connected to Redis');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Could not connect to Redis at startup: ${msg}`);
      }
    }
  }

  async onModuleDestroy() {
    if (this.isConnected && this.client.isOpen) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Save active refresh token hash for a user with TTL
   */
  async saveRefreshToken(
    userId: string,
    tokenId: string,
    tokenHash: string,
    ttlSeconds: number,
  ): Promise<void> {
    const refreshKey = `auth:refresh:${userId}:${tokenId}`;
    const userTokensKey = `auth:user_tokens:${userId}`;

    await this.client.set(refreshKey, tokenHash, { EX: ttlSeconds });
    await this.client.sAdd(userTokensKey, tokenId);
    await this.client.expire(userTokensKey, ttlSeconds);
  }

  /**
   * Get stored hash of a refresh token
   */
  async getRefreshToken(userId: string, tokenId: string): Promise<string | null> {
    const refreshKey = `auth:refresh:${userId}:${tokenId}`;
    return this.client.get(refreshKey);
  }

  /**
   * Delete a specific refresh token (used on rotation or single logout)
   */
  async deleteRefreshToken(userId: string, tokenId: string): Promise<void> {
    const refreshKey = `auth:refresh:${userId}:${tokenId}`;
    const userTokensKey = `auth:user_tokens:${userId}`;

    await this.client.del(refreshKey);
    await this.client.sRem(userTokensKey, tokenId);
  }

  /**
   * Revoke all tokens for a user (triggered on Replay Attack detection)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const userTokensKey = `auth:user_tokens:${userId}`;
    const activeTokenIds = await this.client.sMembers(userTokensKey);

    if (activeTokenIds && activeTokenIds.length > 0) {
      const keysToDelete = activeTokenIds.map((tid) => `auth:refresh:${userId}:${tid}`);
      await this.client.del(keysToDelete);
    }

    await this.client.del(userTokensKey);
    this.logger.warn(`Revoked all refresh tokens for compromised/logged-out user ${userId}`);
  }

  /**
   * Blacklist an access token until its expiration time
   */
  async blacklistAccessToken(tokenHash: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      return;
    }
    const blacklistKey = `auth:blacklist:${tokenHash}`;
    await this.client.set(blacklistKey, '1', { EX: ttlSeconds });
  }

  /**
   * Check if an access token hash is currently blacklisted
   */
  async isBlacklisted(tokenHash: string): Promise<boolean> {
    const blacklistKey = `auth:blacklist:${tokenHash}`;
    const exists = await this.client.exists(blacklistKey);
    return exists > 0;
  }
}
