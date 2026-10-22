import { Injectable, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AuthRedisRepository } from '@/modules/auth/repositories/auth.redis.repository.js';
import type { JwtAccessTokenPayload, JwtRefreshTokenPayload } from '@/modules/auth/interfaces/jwt-payload.interface.js';

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(AuthRedisRepository) private readonly authRedisRepo: AuthRedisRepository,
  ) {}

  async execute(userId: string, accessToken?: string, refreshToken?: string) {
    // 1. Blacklist the access token if provided
    if (accessToken) {
      try {
        const decoded = this.jwtService.decode(accessToken) as JwtAccessTokenPayload | null;
        if (decoded?.exp) {
          const nowSeconds = Math.floor(Date.now() / 1000);
          const remainingTtl = decoded.exp - nowSeconds;
          if (remainingTtl > 0) {
            const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
            await this.authRedisRepo.blacklistAccessToken(tokenHash, remainingTtl);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Could not decode access token for blacklist during logout: ${msg}`);
      }
    }

    // 2. Remove the specific refresh token if provided
    if (refreshToken) {
      try {
        const decodedRefresh = this.jwtService.decode(refreshToken) as JwtRefreshTokenPayload | null;
        if (decodedRefresh?.tokenId) {
          await this.authRedisRepo.deleteRefreshToken(userId, decodedRefresh.tokenId);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Could not decode refresh token during logout: ${msg}`);
      }
    }

    return { message: 'Logged out successfully' };
  }
}
