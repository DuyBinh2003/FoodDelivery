import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';

@Injectable()
export class UserReadRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(CustomerProfile)
    private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(DriverProfile)
    private readonly driverProfileRepo: Repository<DriverProfile>,
  ) {}

  async countUsers(): Promise<number> {
    return this.userRepo.count();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email, is_deleted: false } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id, is_deleted: false } });
  }

  async getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
    return this.customerProfileRepo.findOne({ where: { user_id: userId, is_deleted: false } });
  }

  async getDriverProfile(userId: string): Promise<DriverProfile | null> {
    return this.driverProfileRepo.findOne({ where: { user_id: userId, is_deleted: false } });
  }
}
