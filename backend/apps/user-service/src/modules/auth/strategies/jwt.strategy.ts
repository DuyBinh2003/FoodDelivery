import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { AuthRedisRepository } from '@/modules/auth/repositories/auth.redis.repository.js';
import type { JwtAccessTokenPayload } from '@/modules/auth/interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(AuthRedisRepository) private readonly authRedisRepo: AuthRedisRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'default-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtAccessTokenPayload) {
    const rawToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (rawToken) {
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const isRevoked = await this.authRedisRepo.isBlacklisted(tokenHash);
      if (isRevoked) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return { id: payload.id, email: payload.email, role: payload.role };
  }
}
