import { Controller, Get, Inject, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { UserRole } from '@/modules/users/entities/user.entity.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from '@/modules/users/dto/profile.dto.js';
import { GetCustomerProfileUseCase } from '@/modules/users/usecases/get-customer-profile.usecase.js';
import { GetDriverProfileUseCase } from '@/modules/users/usecases/get-driver-profile.usecase.js';
import { UpdateCustomerProfileUseCase } from '@/modules/users/usecases/update-customer-profile.usecase.js';
import { UpdateDriverProfileUseCase } from '@/modules/users/usecases/update-driver-profile.usecase.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    @Inject(GetCustomerProfileUseCase) private readonly getCustomerProfileUseCase: GetCustomerProfileUseCase,
    @Inject(GetDriverProfileUseCase) private readonly getDriverProfileUseCase: GetDriverProfileUseCase,
    @Inject(UpdateCustomerProfileUseCase) private readonly updateCustomerProfileUseCase: UpdateCustomerProfileUseCase,
    @Inject(UpdateDriverProfileUseCase) private readonly updateDriverProfileUseCase: UpdateDriverProfileUseCase,
  ) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    if (user.role === UserRole.CUSTOMER) {
      return this.getCustomerProfileUseCase.execute({ userId: user.id });
    }
    if (user.role === UserRole.DRIVER) {
      return this.getDriverProfileUseCase.execute({ userId: user.id });
    }
    return user; // Return basic user info for ADMIN
  }

  @Roles(UserRole.CUSTOMER)
  @Put('profile/customer')
  updateCustomerProfile(@CurrentUser() user: any, @Body() dto: UpdateCustomerProfileDto) {
    return this.updateCustomerProfileUseCase.execute({ userId: user.id, dto });
  }

  @Roles(UserRole.DRIVER)
  @Put('profile/driver')
  updateDriverProfile(@CurrentUser() user: any, @Body() dto: UpdateDriverProfileDto) {
    return this.updateDriverProfileUseCase.execute({ userId: user.id, dto });
  }
}
