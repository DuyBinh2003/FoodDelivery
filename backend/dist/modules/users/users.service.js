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
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from './entities/user.entity.js';
import { CustomerProfile } from './entities/customer-profile.entity.js';
import { DriverProfile, DriverStatus } from './entities/driver-profile.entity.js';
let UsersService = class UsersService {
    userRepository;
    customerProfileRepository;
    driverProfileRepository;
    dataSource;
    constructor(userRepository, customerProfileRepository, driverProfileRepository, dataSource) {
        this.userRepository = userRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.dataSource = dataSource;
    }
    async countUsers() {
        return this.userRepository.count();
    }
    async findByEmail(email) {
        return this.userRepository.findOne({ where: { email, is_deleted: false } });
    }
    async findById(id) {
        return this.userRepository.findOne({ where: { id, is_deleted: false } });
    }
    async createUserWithProfile(dto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const user = queryRunner.manager.create(User, {
                email: dto.email,
                password_hash: dto.password_hash,
                role: dto.role,
            });
            const savedUser = await queryRunner.manager.save(user);
            if (dto.role === UserRole.CUSTOMER) {
                const profile = queryRunner.manager.create(CustomerProfile, {
                    user_id: savedUser.id,
                    full_name: dto.fullName,
                    phone: dto.phone,
                });
                await queryRunner.manager.save(profile);
            }
            else if (dto.role === UserRole.DRIVER) {
                const profile = queryRunner.manager.create(DriverProfile, {
                    user_id: savedUser.id,
                    status: DriverStatus.OFFLINE,
                });
                await queryRunner.manager.save(profile);
            }
            await queryRunner.commitTransaction();
            return savedUser;
        }
        catch (err) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException('Could not create user and profile');
        }
        finally {
            await queryRunner.release();
        }
    }
    async getCustomerProfile(userId) {
        const profile = await this.customerProfileRepository.findOne({ where: { user_id: userId, is_deleted: false } });
        if (!profile) {
            throw new NotFoundException('Customer profile not found');
        }
        return profile;
    }
    async updateCustomerProfile(userId, dto) {
        const profile = await this.getCustomerProfile(userId);
        Object.assign(profile, dto);
        return this.customerProfileRepository.save(profile);
    }
    async getDriverProfile(userId) {
        const profile = await this.driverProfileRepository.findOne({ where: { user_id: userId, is_deleted: false } });
        if (!profile) {
            throw new NotFoundException('Driver profile not found');
        }
        return profile;
    }
    async updateDriverProfile(userId, dto) {
        const profile = await this.getDriverProfile(userId);
        Object.assign(profile, dto);
        return this.driverProfileRepository.save(profile);
    }
};
UsersService = __decorate([
    Injectable(),
    __param(0, InjectRepository(User)),
    __param(1, InjectRepository(CustomerProfile)),
    __param(2, InjectRepository(DriverProfile)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        Repository,
        DataSource])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map