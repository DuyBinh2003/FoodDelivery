import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
export const getRedisConfig = () => ({
    isGlobal: true,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService) => {
        const host = configService.get('redis.host');
        const port = configService.get('redis.port');
        return {
            store: await redisStore({
                url: `redis://${host}:${port}`,
                ttl: 60000,
            }),
        };
    },
});
//# sourceMappingURL=redis.config.js.map