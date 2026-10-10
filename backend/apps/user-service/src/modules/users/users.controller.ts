import { Controller, Get, Inject, Put, Post, Body, UseGuards } from '@nestjs/common';
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

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    @Inject(GetCustomerProfileUseCase) private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    @Inject(GetDriverProfileUseCase) private readonly getDriverProfileUseCase: GetDriverProfileUseCase,
    @Inject(UpdateCustomerProfileUseCase) private readonly updateCustomerProfileUseCase: UpdateCustomerProfileUseCase,
    @Inject(UpdateDriverProfileUseCase) private readonly updateDriverProfileUseCase: UpdateDriverProfileUseCase,
    @Inject(SubmitRegistrationUseCase) private readonly submitRegistrationUseCase: SubmitRegistrationUseCase,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    if (user.role === UserRole.USER) {
      const customerProfile = await this.getCustomerProfileUseCase.execute({ userId: user.id });
      let driverProfile = null;
      try {
        driverProfile = await this.getDriverProfileUseCase.execute({ userId: user.id });
      } catch (_e) {
        // Not a driver yet, ignore
      }
      return {
        ...user,
        customerProfile,
        driverProfile,
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
  @Post('registrations')
  submitRegistration(@CurrentUser() user: any, @Body() dto: CreateRegistrationDto) {
    return this.submitRegistrationUseCase.execute(user.id, dto);
  }
}

