import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '@/modules/auth/auth.controller.js';
import { UsersModule } from '@/modules/users/users.module.js';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy.js';
import { LoginUseCase } from '@/modules/auth/usecases/login.usecase.js';
import { RegisterUseCase } from '@/modules/auth/usecases/register.usecase.js';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<any>('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, LoginUseCase, RegisterUseCase],
  exports: [LoginUseCase, RegisterUseCase],
})
export class AuthModule {}
