import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { getDatabaseConfig } from '@/config/database.config.js';
import { getRedisConfig } from '@/config/redis.config.js';
import configuration from '@/config/configuration.js';
import { RestaurantsModule } from '@/modules/restaurants/restaurants.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService, 'schema_restaurant'),
    }),
    CacheModule.registerAsync(getRedisConfig()),
    RestaurantsModule
  ],
})
export class AppModule {}

