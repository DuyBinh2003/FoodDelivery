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
import { Controller, Get, Inject, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { UserRole } from './entities/user.entity.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from './dto/profile.dto.js';
import { GetCustomerProfileUseCase } from './usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from './usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from './usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from './usecases/update-driver-profile.usecase.js';
let UsersController = class UsersController {
    getCustomerProfileUseCase;
    getDriverProfileUseCase;
    updateCustomerProfileUseCase;
    updateDriverProfileUseCase;
    constructor(getCustomerProfileUseCase, getDriverProfileUseCase, updateCustomerProfileUseCase, updateDriverProfileUseCase) {
        this.getCustomerProfileUseCase = getCustomerProfileUseCase;
        this.getDriverProfileUseCase = getDriverProfileUseCase;
        this.updateCustomerProfileUseCase = updateCustomerProfileUseCase;
        this.updateDriverProfileUseCase = updateDriverProfileUseCase;
    }
    async getProfile(user) {
        if (user.role === UserRole.USER) {
            const customerProfile = await this.getCustomerProfileUseCase.execute({ userId: user.id });
            let driverProfile = null;
            try {
                driverProfile = await this.getDriverProfileUseCase.execute({ userId: user.id });
            }
            catch (e) {
            }
            return {
                ...user,
                customerProfile,
                driverProfile,
            };
        }
        return user;
    }
    updateCustomerProfile(user, dto) {
        return this.updateCustomerProfileUseCase.execute({ userId: user.id, dto });
    }
    updateDriverProfile(user, dto) {
        return this.updateDriverProfileUseCase.execute({ userId: user.id, dto });
    }
};
__decorate([
    Get('profile'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    Roles(UserRole.USER),
    Put('profile/customer'),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateCustomerProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateCustomerProfile", null);
__decorate([
    Roles(UserRole.USER),
    Put('profile/driver'),
    __param(0, CurrentUser()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateDriverProfileDto]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "updateDriverProfile", null);
UsersController = __decorate([
    Controller('users'),
    UseGuards(JwtAuthGuard, RolesGuard),
    __param(0, Inject(GetCustomerProfileUseCase)),
    __param(1, Inject(GetDriverProfileUseCase)),
    __param(2, Inject(UpdateCustomerProfileUseCase)),
    __param(3, Inject(UpdateDriverProfileUseCase)),
    __metadata("design:paramtypes", [GetCustomerProfileUseCase,
        GetDriverProfileUseCase,
        UpdateCustomerProfileUseCase,
        UpdateDriverProfileUseCase])
], UsersController);
export { UsersController };
//# sourceMappingURL=users.controller.js.map