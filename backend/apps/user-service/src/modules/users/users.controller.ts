import { Controller, Get, Inject, Put, Patch, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { UserRole } from '@/common/enums/user-role.enum.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from '@/modules/users/dto/profile.dto.js';
import { GetCustomerProfileUseCase } from '@/modules/users/usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from '@/modules/users/usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from '@/modules/users/usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from '@/modules/users/usecases/update-driver-profile.usecase.js';
import { SubmitRegistrationUseCase } from '@/modules/users/usecases/submit-registration.usecase.js';
import { CreateRegistrationDto } from '@/modules/users/dto/create-registration.dto.js';
import { RegistrationWriteRepository } from '@/modules/users/repositories/registration.write.repository.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';

  constructor(
    @Inject(GetCustomerProfileUseCase) private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    @Inject(GetDriverProfileUseCase) private readonly getDriverProfileUseCase: GetDriverProfileUseCase,
    @Inject(UpdateCustomerProfileUseCase) private readonly updateCustomerProfileUseCase: UpdateCustomerProfileUseCase,
    @Inject(UpdateDriverProfileUseCase) private readonly updateDriverProfileUseCase: UpdateDriverProfileUseCase,
    @Inject(SubmitRegistrationUseCase) private readonly submitRegistrationUseCase: SubmitRegistrationUseCase,
    @Inject(RegistrationWriteRepository) private readonly registrationWriteRepo: RegistrationWriteRepository,
  ) { }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    if (user.role === UserRole.USER) {
      const customerProfile = await this.getCustomerProfileUseCase.execute({ userId: user.id });
      let driverProfile: DriverProfile | null = null;
      try {
        driverProfile = await this.getDriverProfileUseCase.execute({ userId: user.id });
      } catch (_e) {
        // Not a driver yet, ignore
      }

      // Check registration requests
      const [driverReg, restaurantReg] = await Promise.all([
        this.registrationWriteRepo.findLatestByUserIdAndType(user.id, 'DRIVER'),
        this.registrationWriteRepo.findLatestByUserIdAndType(user.id, 'RESTAURANT'),
      ]);

      // Check if user owns a restaurant in restaurant-service
      let restaurant = null;
      try {
        const res = await fetch(`${this.restaurantUrl}/internal/restaurants/by-owner/${user.id}`);
        if (res.ok) {
          const resData = await res.json().catch(() => null);
          if (resData && resData.id) {
            restaurant = resData;
          }
        }
      } catch (_err) {
        // Service might be unreachable or error, continue
      }

      const hasDriver = !!(driverProfile && driverProfile.verification_status === 'APPROVED');
      const hasRestaurant = !!restaurant;

      return {
        ...user,
        customerProfile,
        driverProfile,
        restaurant,
        hasDriver,
        hasRestaurant,
        driverRegistrationStatus: driverReg?.status || (hasDriver ? 'APPROVED' : null),
        restaurantRegistrationStatus: restaurantReg?.status || (hasRestaurant ? 'APPROVED' : null),
      };
    }
    return user; // Return basic user info for ADMIN
  }

  @Roles(UserRole.USER)
  @Put('profile/customer')
  updateCustomerProfile(@CurrentUser() user: any, @Body() dto: UpdateCustomerProfileDto) {
    return this.updateCustomerProfileUseCase.execute({ userId: user.id, dto });
  }

  @Roles(UserRole.USER)
  @Put('profile/driver')
  updateDriverProfile(@CurrentUser() user: any, @Body() dto: UpdateDriverProfileDto) {
    return this.updateDriverProfileUseCase.execute({ userId: user.id, dto });
  }

  @Roles(UserRole.USER)
  @Patch('profile/driver/status')
  updateDriverStatus(@CurrentUser() user: any, @Body() body: { status: string }) {
    return this.updateDriverProfileUseCase.execute({ userId: user.id, dto: { status: body.status } });
  }

  @Roles(UserRole.USER)
  @Post('registrations')
  submitRegistration(@CurrentUser() user: any, @Body() dto: CreateRegistrationDto) {
    return this.submitRegistrationUseCase.execute(user.id, dto);
  }
}


