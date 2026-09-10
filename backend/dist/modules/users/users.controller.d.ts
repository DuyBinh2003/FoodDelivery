import { UsersService } from './users.service.js';
import type { Cache } from 'cache-manager';
export declare class UsersController {
    private readonly usersService;
    private cacheManager;
    constructor(usersService: UsersService, cacheManager: Cache);
    testDbConnection(): Promise<{
        message: string;
        userCount: number;
        redisCacheTest: unknown;
    }>;
}
