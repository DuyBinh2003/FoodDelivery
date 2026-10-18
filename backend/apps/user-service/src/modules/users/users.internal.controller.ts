import { Controller, Get, Post, Param, Body, NotFoundException, Inject, ParseUUIDPipe, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/users/entities/user.entity.js';
import { CustomerProfile } from '@/modules/users/entities/customer-profile.entity.js';
import { DriverProfile, DriverStatus } from '@/modules/users/entities/driver-profile.entity.js';
import { RegistrationRequest } from '@/modules/users/entities/registration-request.entity.js';
import { ReviewRegistrationDto, RegistrationStatus } from '@/modules/users/dto/review-registration.dto.js';
import { UserGateway } from '@/modules/users/gateways/user.gateway.js';
import { UserAddressRepository } from '@/modules/users/repositories/user-address.repository.js';

@Controller('internal')
export class UsersInternalController {
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL!;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(CustomerProfile) private readonly customerProfileRepo: Repository<CustomerProfile>,
    @InjectRepository(DriverProfile) private readonly driverRepo: Repository<DriverProfile>,
    @InjectRepository(RegistrationRequest) private readonly regRepo: Repository<RegistrationRequest>,
    @Inject(UserGateway) private readonly userGateway: UserGateway,
    @Inject(UserAddressRepository) private readonly addressRepo: UserAddressRepository,
  ) {}

  @Get('users/metrics')
  async getMetrics() {
    return {
      totalUsers: await this.userRepo.count(),
      totalDrivers: await this.driverRepo.count()
    };
  }

  @Get('users/admin-list')
  async getUsersAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));
    const offset = (p - 1) * l;

    let query = `
      SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.created_at,
        cp.full_name,
        cp.phone
      FROM schema_user.m_user u
      LEFT JOIN schema_user.m_customer_profile cp ON cp.user_id = u.id AND cp.is_deleted = false
      WHERE u.is_deleted = false
    `;
    const params: unknown[] = [];

    if (role) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.email ILIKE $${params.length} OR cp.full_name ILIKE $${params.length} OR cp.phone ILIKE $${params.length})`;
    }

    const countQuery = `SELECT COUNT(*)::int AS count FROM (${query}) AS sub`;
    const totalRes = await this.userRepo.query(countQuery, params);
    const total = totalRes[0]?.count || 0;

    params.push(l);
    query += ` ORDER BY u.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const rows = await this.userRepo.query(query, params);

    return {
      data: rows,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  @Get('drivers/admin-list')
  async getDriversAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));
    const offset = (p - 1) * l;

    let query = `
      SELECT 
        d.id, 
        d.user_id,
        u.email,
        cp.full_name,
        cp.phone,
        d.status, 
        d.verification_status,
        d.vehicle_plate, 
        d.vehicle_type,
        d.created_at
      FROM schema_user.m_driver_profile d
      JOIN schema_user.m_user u ON u.id = d.user_id
      LEFT JOIN schema_user.m_customer_profile cp ON cp.user_id = d.user_id AND cp.is_deleted = false
      WHERE d.is_deleted = false
    `;
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (u.email ILIKE $${params.length} OR cp.full_name ILIKE $${params.length} OR d.vehicle_plate ILIKE $${params.length})`;
    }

    const countQuery = `SELECT COUNT(*)::int AS count FROM (${query}) AS sub`;
    const totalRes = await this.driverRepo.query(countQuery, params);
    const total = totalRes[0]?.count || 0;

    params.push(l);
    query += ` ORDER BY d.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const rows = await this.driverRepo.query(query, params);

    return {
      data: rows,
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
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

  @Get('drivers/:userId/status')
  async getDriverStatus(@Param('userId', ParseUUIDPipe) userId: string) {
    const driver = await this.driverRepo.findOne({
      where: { user_id: userId, is_deleted: false },
    });
    if (!driver) {
      return {
        is_driver: false,
        id: null,
        user_id: userId,
        status: DriverStatus.OFFLINE,
        verification_status: 'NONE',
        is_active: false,
        vehicle_plate: null,
        vehicle_type: null,
      };
    }

    const isActive =
      driver.status === DriverStatus.ONLINE &&
      driver.verification_status === 'APPROVED';

    return {
      is_driver: true,
      id: driver.id,
      user_id: driver.user_id,
      status: driver.status,
      verification_status: driver.verification_status,
      is_active: isActive,
      vehicle_plate: driver.vehicle_plate,
      vehicle_type: driver.vehicle_type,
    };
  }

  @Get('users/:id/addresses')
  async getUserAddressesInternal(@Param('id', ParseUUIDPipe) id: string) {
    return this.addressRepo.findUserAddresses(id);
  }

  @Get('users/:id/default-address')
  async getDefaultAddressInternal(@Param('id', ParseUUIDPipe) id: string) {
    const addresses = await this.addressRepo.findUserAddresses(id);
    const defaultAddr = addresses.find((a) => a.is_default) || addresses[0] || null;
    if (!defaultAddr) {
      throw new NotFoundException(`User ${id} has no registered addresses`);
    }
    return defaultAddr;
  }
}
