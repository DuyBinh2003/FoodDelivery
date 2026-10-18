import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity.js';
import { UserRole } from '@/common/enums/user-role.enum.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';

export interface CreateUserPayload {
  email: string;
  password_hash: string;
  role: UserRole;
  fullName?: string;
  phone?: string;
}

@Injectable()
export class UserWriteRepository {
  private readonly logger = new Logger(UserWriteRepository.name);

  constructor(
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
    @Inject(DataSource) private readonly dataSource: DataSource,
  ) { }

  async createUserWithProfile(payload: CreateUserPayload): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, {
        email: payload.email,
        password_hash: payload.password_hash,
        role: payload.role,
      });
      const savedUser = await queryRunner.manager.save(user);

      if (payload.role === UserRole.USER) {
        const profile = queryRunner.manager.create(CustomerProfile, {
          user_id: savedUser.id,
          full_name: payload.fullName,
          phone: payload.phone,
        });
        await queryRunner.manager.save(profile);
      }

      await queryRunner.commitTransaction();
      return savedUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create user and profile in transaction:', error);
      throw new BadRequestException('Could not create user and profile', { cause: error });
    } finally {
      await queryRunner.release();
    }
  }

  async saveCustomerProfile(profile: CustomerProfile): Promise<CustomerProfile> {
    return this.customerProfileRepo.save(profile);
  }

  async saveDriverProfile(profile: DriverProfile): Promise<DriverProfile> {
    return this.driverProfileRepo.save(profile);
  }
}

