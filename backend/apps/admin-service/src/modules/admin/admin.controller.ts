import { Controller, Get, Post, Put, Body, Param, UseGuards, Inject } from '@nestjs/common';
import { AdminService } from '@/modules/admin/admin.service.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/common/enums/user-role.enum.js';
import { ReviewApprovalDto } from '@/modules/admin/dto/review-approval.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService
  ) { }

  @Get('metrics/dashboard')
  getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('approvals/pending')
  getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Post('approvals/:id/review')
  reviewApproval(
    @Param('id') id: string,
    @Body() dto: ReviewApprovalDto,
  ) {
    return this.adminService.reviewApproval(id, dto);
  }

  @Post('approvals/restaurant/:id/approve')
  approveRestaurant(
    @Param('id') id: string,
    @Body() body?: { review_message?: string },
  ) {
    return this.adminService.approveRestaurant(id, body?.review_message);
  }

  @Post('approvals/restaurant/:id/reject')
  rejectRestaurant(
    @Param('id') id: string,
    @Body() body?: { review_message?: string },
  ) {
    return this.adminService.rejectRestaurant(id, body?.review_message);
  }

  @Post('approvals/driver/:id/approve')
  approveDriver(
    @Param('id') id: string,
    @Body() body?: { review_message?: string },
  ) {
    return this.adminService.approveDriver(id, body?.review_message);
  }

  @Post('approvals/driver/:id/reject')
  rejectDriver(
    @Param('id') id: string,
    @Body() body?: { review_message?: string },
  ) {
    return this.adminService.rejectDriver(id, body?.review_message);
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
