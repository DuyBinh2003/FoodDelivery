import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

export const getRedisConfig = (): CacheModuleAsyncOptions => ({
  isGlobal: true,
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const host = configService.get<string>('redis.host')!;
    const port = configService.get<number>('redis.port')!;
    
    return {
      store: await redisStore({
        url: `redis://${host}:${port}`,
        ttl: 60000, // 60 seconds default TTL
      }),
    };
  },
});
