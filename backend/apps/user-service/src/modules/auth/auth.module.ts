import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { AuthController } from '@/modules/auth/auth.controller.js';
import { UsersModule } from '@/modules/users/users.module.js';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy.js';
import { LoginUseCase } from '@/modules/auth/usecases/login.usecase.js';
import { RegisterUseCase } from '@/modules/auth/usecases/register.usecase.js';
import { RefreshTokenUseCase } from '@/modules/auth/usecases/refresh-token.usecase.js';
import { LogoutUseCase } from '@/modules/auth/usecases/logout.usecase.js';
import { AuthRedisRepository } from '@/modules/auth/repositories/auth.redis.repository.js';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<SignOptions['expiresIn']>('jwt.expiresIn') || '15m';
        return {
          secret: configService.get<string>('jwt.secret') || 'default-secret',
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    LoginUseCase,
    RegisterUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    AuthRedisRepository,
  ],
  exports: [
    PassportModule,
    LoginUseCase,
    RegisterUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    AuthRedisRepository,
  ],
})
export class AuthModule {}
