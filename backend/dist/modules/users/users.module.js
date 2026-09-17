var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller.js';
import { User } from './entities/user.entity.js';
import { CustomerProfile } from './entities/customer-profile.entity.js';
import { DriverProfile } from './entities/driver-profile.entity.js';
import { PassportModule } from '@nestjs/passport';
import { UserReadRepository } from './repositories/user.read.repository.js';
import { UserWriteRepository } from './repositories/user.write.repository.js';
import { GetCustomerProfileUseCase } from './usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from './usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from './usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from './usecases/update-driver-profile.usecase.js';
let UsersModule = class UsersModule {
};
UsersModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature([User, CustomerProfile, DriverProfile]), PassportModule.register({ defaultStrategy: 'jwt' })],
        controllers: [UsersController],
        providers: [
            UserReadRepository,
            UserWriteRepository,
            GetCustomerProfileUseCase,
            GetDriverProfileUseCase,
            UpdateCustomerProfileUseCase,
            UpdateDriverProfileUseCase,
        ],
        exports: [
            UserReadRepository,
            UserWriteRepository,
        ],
    })
], UsersModule);
export { UsersModule };
//# sourceMappingURL=users.module.js.map