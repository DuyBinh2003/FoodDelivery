import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserReadRepository } from '@/modules/users/repositories/user.read.repository.js';
import { AuthRedisRepository } from '@/modules/auth/repositories/auth.redis.repository.js';
import { LoginDto } from '@/modules/auth/dto/auth.dto.js';

@Injectable()
export class LoginUseCase {
  private readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(
    @Inject(UserReadRepository) private readonly userReadRepo: UserReadRepository,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(AuthRedisRepository) private readonly authRedisRepo: AuthRedisRepository,
  ) {}

  async execute(dto: LoginDto) {
    const user = await this.userReadRepo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const tokenId = crypto.randomUUID();

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, tokenId },
      { expiresIn: '7d' },
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.authRedisRepo.saveRefreshToken(
      user.id,
      tokenId,
      tokenHash,
      this.REFRESH_TOKEN_TTL_SECONDS,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: payload,
    };
  }
}
