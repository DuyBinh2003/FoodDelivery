import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Inject } from '@nestjs/common';
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

  @Get('analytics/dashboard')
  getDashboardAnalytics(@Query('range') range?: '7d' | '30d' | 'all') {
    return this.adminService.getDashboardAnalytics(range || '7d');
  }

  @Get('wallet/summary')
  getWalletSummary(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.getPlatformWalletSummary(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('orders')
  getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminOrders({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      search,
    });
  }

  @Get('users')
  getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminUsers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      role,
      search,
    });
  }

  @Get('drivers')
  getDrivers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminDrivers({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      search,
    });
  }

  @Get('restaurants')
  getRestaurants(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAdminRestaurants({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      search,
    });
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
