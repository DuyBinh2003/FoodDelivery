import { Controller, Get, Inject } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  @Get('test-db')
  async testDbConnection() {
    // Gọi DB qua service
    const count = await this.usersService.countUsers();

    // Ghi cache Redis
    await this.cacheManager.set('test_key', `Total users: ${count}`, 10000); // 10s

    // Lấy lại từ cache Redis
    const cachedValue = await this.cacheManager.get('test_key');

    return {
      message: 'Database and Redis connections are working!',
      userCount: count,
      redisCacheTest: cachedValue,
    };
  }
}
