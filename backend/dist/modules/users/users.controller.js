var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Inject } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
let UsersController = class UsersController {
    usersService;
    cacheManager;
    constructor(usersService, cacheManager) {
        this.usersService = usersService;
        this.cacheManager = cacheManager;
    }
    async testDbConnection() {
        const count = await this.usersService.countUsers();
        await this.cacheManager.set('test_key', `Total users: ${count}`, 10000);
        const cachedValue = await this.cacheManager.get('test_key');
        return {
            message: 'Database and Redis connections are working!',
            userCount: count,
            redisCacheTest: cachedValue,
        };
    }
};
__decorate([
    Get('test-db'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "testDbConnection", null);
UsersController = __decorate([
    Controller('users'),
    __param(1, Inject(CACHE_MANAGER)),
    __metadata("design:paramtypes", [UsersService, Object])
], UsersController);
export { UsersController };
//# sourceMappingURL=users.controller.js.map