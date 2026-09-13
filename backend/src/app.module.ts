import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';
import { getDatabaseConfig } from '@/config/database.config.js';
import { getRedisConfig } from '@/config/redis.config.js';
import { UsersModule } from '@/modules/users/users.module.js';
import { AuthModule } from '@/modules/auth/auth.module.js';

import configuration from '@/config/configuration.js';
import { validate } from '@/config/validation.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
      validate: validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    CacheModule.registerAsync(getRedisConfig()),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
