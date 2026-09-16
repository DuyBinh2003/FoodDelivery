import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserRole } from '@/modules/users/entities/user.entity.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';
import { DriverProfile, DriverStatus } from '@/modules/users/entities/driver-profile.entity.js';
import { RegisterDto } from '@/modules/auth/dto/auth.dto.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from '@/modules/users/dto/profile.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepository: Repository<CustomerProfile>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepository: Repository<DriverProfile>,
    @Inject(DataSource) private readonly dataSource: DataSource,
  ) {}

  async countUsers(): Promise<number> {
    return this.userRepository.count();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email, is_deleted: false } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id, is_deleted: false } });
  }

  async createUserWithProfile(dto: RegisterDto & { password_hash: string }): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Create User
      const user = queryRunner.manager.create(User, {
        email: dto.email,
        password_hash: dto.password_hash,
        role: dto.role,
      });
      const savedUser = await queryRunner.manager.save(user);

      // 2. Create Profile based on Role
      if (dto.role === UserRole.CUSTOMER) {
        const profile = queryRunner.manager.create(CustomerProfile, {
          user_id: savedUser.id,
          full_name: dto.fullName,
          phone: dto.phone,
        });
        await queryRunner.manager.save(profile);
      } else if (dto.role === UserRole.DRIVER) {
        const profile = queryRunner.manager.create(DriverProfile, {
          user_id: savedUser.id,
          status: DriverStatus.OFFLINE,
        });
        await queryRunner.manager.save(profile);
      }

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new BadRequestException('Could not create user and profile');
    } finally {
      await queryRunner.release();
    }
  }

  async getCustomerProfile(userId: string): Promise<CustomerProfile> {
    const profile = await this.customerProfileRepository.findOne({ where: { user_id: userId, is_deleted: false } });
    if (!profile) {
      throw new NotFoundException('Customer profile not found');
    }
    return profile;
  }

  async updateCustomerProfile(userId: string, dto: UpdateCustomerProfileDto): Promise<CustomerProfile> {
    const profile = await this.getCustomerProfile(userId);
    Object.assign(profile, dto);
    return this.customerProfileRepository.save(profile);
  }

  async getDriverProfile(userId: string): Promise<DriverProfile> {
    const profile = await this.driverProfileRepository.findOne({ where: { user_id: userId, is_deleted: false } });
    if (!profile) {
      throw new NotFoundException('Driver profile not found');
    }
    return profile;
  }

  async updateDriverProfile(userId: string, dto: UpdateDriverProfileDto): Promise<DriverProfile> {
    const profile = await this.getDriverProfile(userId);
    Object.assign(profile, dto);
    return this.driverProfileRepository.save(profile);
  }
}
