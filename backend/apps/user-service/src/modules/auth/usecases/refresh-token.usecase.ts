import { Injectable, Inject, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto.js';
import { AuthRedisRepository } from '@/modules/auth/repositories/auth.redis.repository.js';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import type { JwtRefreshTokenPayload } from '@/modules/auth/interfaces/jwt-payload.interface.js';

@Injectable()
export class RefreshTokenUseCase {
  private readonly logger = new Logger(RefreshTokenUseCase.name);
  private readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AuthRedisRepository) private readonly authRedisRepo: AuthRedisRepository,
    @Inject(UserReadRepository) private readonly userReadRepo: UserReadRepository,
  ) {}

  async execute(dto: RefreshTokenDto) {
    const jwtSecret = this.configService.get<string>('jwt.secret');

    let payload: JwtRefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshTokenPayload>(dto.refresh_token, {
        secret: jwtSecret,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Invalid or expired refresh token verification failed: ${msg}`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!payload?.id || !payload?.tokenId) {
      throw new UnauthorizedException('Malformed token payload');
    }

    const userId = payload.id;
    const tokenId = payload.tokenId;

    const user = await this.userReadRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    const incomingHash = crypto.createHash('sha256').update(dto.refresh_token).digest('hex');
    const storedHash = await this.authRedisRepo.getRefreshToken(userId, tokenId);

    // Reuse detection: If token was already rotated or revoked
    if (!storedHash || storedHash !== incomingHash) {
      this.logger.error(
        `Security Alert: Refresh token reuse detected for user ${userId} (tokenId: ${tokenId})! Revoking all sessions.`,
      );
      await this.authRedisRepo.revokeAllUserTokens(userId);
      throw new UnauthorizedException('Token reuse detected. All active sessions have been terminated for security.');
    }

    // 1. Invalidate used refresh token immediately
    await this.authRedisRepo.deleteRefreshToken(userId, tokenId);

    // 2. Issue new tokens with fresh tokenId
    const newTokenId = crypto.randomUUID();
    const userPayload = { id: user.id, email: user.email, role: user.role };

    const newAccessToken = this.jwtService.sign(userPayload, {
      expiresIn: '15m',
    });

    const newRefreshToken = this.jwtService.sign(
      { ...userPayload, tokenId: newTokenId },
      { expiresIn: '7d' },
    );

    // 3. Save new refresh token hash to Redis
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await this.authRedisRepo.saveRefreshToken(
      userId,
      newTokenId,
      newTokenHash,
      this.REFRESH_TOKEN_TTL_SECONDS,
    );

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      user: userPayload,
    };
  }
}
