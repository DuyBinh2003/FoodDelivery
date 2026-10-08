import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from '@/modules/admin/admin.service.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/modules/users/entities/user.entity.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics/dashboard')
  getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('approvals/pending')
  getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Post('approvals/restaurant/:id/approve')
  approveRestaurant(@Param('id') id: string) {
    return this.adminService.approveRestaurant(id);
  }

  @Post('approvals/restaurant/:id/reject')
  rejectRestaurant(@Param('id') id: string) {
    return this.adminService.rejectRestaurant(id);
  }

  @Post('approvals/driver/:id/approve')
  approveDriver(@Param('id') id: string) {
    return this.adminService.approveDriver(id);
  }

  @Post('approvals/driver/:id/reject')
  rejectDriver(@Param('id') id: string) {
    return this.adminService.rejectDriver(id);
  }

  @Get('configs')
  getConfigs() {
    return this.adminService.getConfigs();
  }

  @Put('configs')
  updateConfig(@Body() dto: { key: string; value: string }) {
    return this.adminService.updateConfig(dto.key, dto.value);
  }
}
