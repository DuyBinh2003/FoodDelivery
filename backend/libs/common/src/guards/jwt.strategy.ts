import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
        (req: Request) => {
          if (!req) return null;
          if (req.cookies && req.cookies.access_token) {
            return req.cookies.access_token;
          }
          if (req.headers && req.headers.cookie) {
            const match = req.headers.cookie
              .split('; ')
              .find((row) => row.startsWith('access_token='));
            if (match) {
              return match.split('=')[1];
            }
          }
          return null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return { id: payload.id, email: payload.email, role: payload.role };
  }
}
