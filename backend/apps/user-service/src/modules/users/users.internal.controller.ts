import { Controller, Get, Post, Param, Body, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity.js';
import { DriverProfile, DriverStatus } from '@/modules/users/entities/driver-profile.entity.js';
import { RegistrationRequest } from '@/modules/users/entities/registration-request.entity.js';
import { ReviewRegistrationDto, RegistrationStatus } from '@/modules/users/dto/review-registration.dto.js';
import { UserGateway } from '@/modules/users/gateways/user.gateway.js';

@Controller('internal')
export class UsersInternalController {
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(DriverProfile) private readonly driverRepo: Repository<DriverProfile>,
    @InjectRepository(RegistrationRequest) private readonly regRepo: Repository<RegistrationRequest>,
    @Inject(UserGateway) private readonly userGateway: UserGateway,
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
      order: { createdAt: 'ASC' },
    });
    
    const restaurants = pendingRequests
      .filter((r) => r.type === 'RESTAURANT')
      .map((r) => {
        const payload = r.payload as Record<string, unknown>;
        return {
          id: r.id,
          userId: r.userId,
          userEmail: r.user?.email || 'Unknown',
          name: (payload?.restaurant_name as string) || (payload?.name as string) || r.user?.email || 'Unknown',
          type: 'RESTAURANT' as const,
          payload: r.payload,
          status: r.status,
          created_at: r.createdAt,
        };
      });

    const drivers = pendingRequests
      .filter((r) => r.type === 'DRIVER')
      .map((r) => {
        const payload = r.payload as Record<string, unknown>;
        return {
          id: r.id,
          userId: r.userId,
          userEmail: r.user?.email || 'Unknown',
          name: (payload?.full_name as string) || (payload?.name as string) || r.user?.email || r.userId,
          type: 'DRIVER' as const,
          payload: r.payload,
          status: r.status,
          created_at: r.createdAt,
        };
      });

    return { restaurants, drivers };
  }

  @Post('registrations/:id/review')
  async reviewRegistration(
    @Param('id') id: string,
    @Body() dto: ReviewRegistrationDto,
  ) {
    const reg = await this.regRepo.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!reg) {
      throw new NotFoundException('Registration request not found');
    }

    reg.status = dto.status;
    reg.reviewMessage = dto.review_message || null;
    await this.regRepo.save(reg);

    // If APPROVED
    if (dto.status === RegistrationStatus.APPROVED) {
      if (reg.type === 'RESTAURANT') {
        const payload = reg.payload as Record<string, unknown>;
        const restaurantName = (payload.restaurant_name as string) || (payload.name as string) || 'Nhà hàng mới';
        const address = (payload.address as string) || '';
        try {
          const res = await fetch(`${this.restaurantUrl}/internal/restaurants/from-registration`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              owner_id: reg.userId,
              name: restaurantName,
              address,
            }),
          });
          if (!res.ok) {
            console.error('[UsersInternalController] restaurant-service returned non-ok status:', res.status);
          }
        } catch (err) {
          console.error('[UsersInternalController] Failed to connect to restaurant-service:', err);
        }
      } else if (reg.type === 'DRIVER') {
        const payload = reg.payload as Record<string, unknown>;
        let driver = await this.driverRepo.findOne({ where: { user_id: reg.userId } });
        if (!driver) {
          driver = this.driverRepo.create({
            user_id: reg.userId,
            status: DriverStatus.OFFLINE,
            verification_status: 'APPROVED',
            vehicle_plate: (payload?.vehicle_plate as string) || null,
            vehicle_type: (payload?.vehicle_type as string) || 'Xe máy',
          });
        } else {
          driver.verification_status = 'APPROVED';
          if (payload?.vehicle_plate) driver.vehicle_plate = payload.vehicle_plate as string;
          if (payload?.vehicle_type) driver.vehicle_type = payload.vehicle_type as string;
        }
        await this.driverRepo.save(driver);
      }
    } else if (dto.status === RegistrationStatus.REJECTED) {
      if (reg.type === 'DRIVER') {
        const driver = await this.driverRepo.findOne({ where: { user_id: reg.userId } });
        if (driver) {
          driver.verification_status = 'REJECTED';
          await this.driverRepo.save(driver);
        }
      }
    }

    // Emit Real-time Notification via UserGateway
    const payloadObj = reg.payload as Record<string, unknown>;
    const entityName =
      (payloadObj?.restaurant_name as string) ||
      (payloadObj?.full_name as string) ||
      (payloadObj?.name as string) ||
      (reg.type === 'RESTAURANT' ? 'Nhà hàng' : 'Tài xế');

    this.userGateway.sendToUser(reg.userId, 'registration_result', {
      id: reg.id,
      type: reg.type,
      status: reg.status,
      message: reg.reviewMessage,
      name: entityName,
    });

    return reg;
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
