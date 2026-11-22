import { Controller, Post, Get, Param, Body, Query, UseGuards, ParseUUIDPipe, ForbiddenException } from '@nestjs/common';
import { AdminService } from '@/modules/admin/admin.service.js';
import { CreateDisputeDto } from '@/modules/admin/dto/create-dispute.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';

interface RequestUser {
  id: string;
  email?: string;
  role?: string;
}

@Controller('disputes')
export class DisputeController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createDispute(
    @Body() dto: CreateDisputeDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.adminService.createDispute({
      ...dto,
      customer_id: user.role === 'ADMIN' && dto.customer_id ? dto.customer_id : user.id,
    });
  }

  @Get('my-disputes')
  @UseGuards(JwtAuthGuard)
  async getMyDisputes(
    @CurrentUser() user: RequestUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getDisputes({
      customerId: user.id,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDisputeById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ) {
    const dispute = await this.adminService.getDisputeById(id);
    if (user.role !== 'ADMIN' && dispute.customer_id !== user.id) {
      throw new ForbiddenException('Bạn không có quyền truy cập khiếu nại này');
    }
    return dispute;
  }
}
