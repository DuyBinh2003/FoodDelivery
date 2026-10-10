import { Controller, Get, Post, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { RegistrationRequest } from '@/modules/users/entities/registration-request.entity.js';

@Controller('internal')
export class UsersInternalController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(DriverProfile) private driverRepo: Repository<DriverProfile>,
    @InjectRepository(RegistrationRequest) private regRepo: Repository<RegistrationRequest>
  ) {}

  @Get('users/metrics')
  async getMetrics() {
    return {
      totalUsers: await this.userRepo.count(),
      totalDrivers: await this.driverRepo.count()
    };
  }

  @Get('users/pending-approvals')
  async getPending() {
    const pendingRequests = await this.regRepo.find({
      where: { status: 'PENDING' },
      relations: { user: true },
    });
    
    const restaurants = pendingRequests
      .filter((r) => r.type === 'RESTAURANT')
      .map((r) => ({
        id: r.id,
        name: (r.payload as any)?.name || r.user?.email || 'Unknown',
        created_at: r.createdAt,
      }));

    const drivers = pendingRequests
      .filter((r) => r.type === 'DRIVER')
      .map((r) => ({
        id: r.id,
        user_id: r.user?.email || r.userId,
        created_at: r.createdAt,
      }));

    return { restaurants, drivers };
  }

  @Post('drivers/:id/approve')
  async approveDriver(@Param('id') id: string) {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (driver) {
      driver.verification_status = 'APPROVED';
      await this.driverRepo.save(driver);
    }
    return driver;
  }

  @Post('drivers/:id/reject')
  async rejectDriver(@Param('id') id: string) {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (driver) {
      driver.verification_status = 'REJECTED';
      await this.driverRepo.save(driver);
    }
    return driver;
  }
}
