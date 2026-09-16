import { Controller, Get, Inject, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from '@/modules/users/users.service.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { UserRole } from '@/modules/users/entities/user.entity.js';
import { UpdateCustomerProfileDto, UpdateDriverProfileDto } from '@/modules/users/dto/profile.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    if (user.role === UserRole.CUSTOMER) {
      return this.usersService.getCustomerProfile(user.id);
    }
    if (user.role === UserRole.DRIVER) {
      return this.usersService.getDriverProfile(user.id);
    }
    return user; // Return basic user info for ADMIN
  }

  @Roles(UserRole.CUSTOMER)
  @Put('profile/customer')
  updateCustomerProfile(@CurrentUser() user: any, @Body() dto: UpdateCustomerProfileDto) {
    return this.usersService.updateCustomerProfile(user.id, dto);
  }

  @Roles(UserRole.DRIVER)
  @Put('profile/driver')
  updateDriverProfile(@CurrentUser() user: any, @Body() dto: UpdateDriverProfileDto) {
    return this.usersService.updateDriverProfile(user.id, dto);
  }
}
