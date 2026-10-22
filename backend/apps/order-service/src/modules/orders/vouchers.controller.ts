import { Controller, Post, Get, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { CreateVoucherUseCase } from '@/modules/orders/usecases/create-voucher.usecase.js';
import { ValidateVoucherUseCase } from '@/modules/orders/usecases/validate-voucher.usecase.js';
import { ApplyVoucherUseCase } from '@/modules/orders/usecases/apply-voucher.usecase.js';
import { RevertVoucherUseCase } from '@/modules/orders/usecases/revert-voucher.usecase.js';
import { GetAvailableVouchersUseCase } from '@/modules/orders/usecases/get-available-vouchers.usecase.js';
import { CreateVoucherDto } from '@/modules/orders/dto/create-voucher.dto.js';
import { ValidateVoucherDto } from '@/modules/orders/dto/validate-voucher.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';

interface AuthenticatedUser {
  userId: string;
  role: string;
  email?: string;
}

@Controller('vouchers')
export class VouchersController {
  constructor(
    private readonly createVoucherUseCase: CreateVoucherUseCase,
    private readonly validateVoucherUseCase: ValidateVoucherUseCase,
    private readonly applyVoucherUseCase: ApplyVoucherUseCase,
    private readonly revertVoucherUseCase: RevertVoucherUseCase,
    private readonly getAvailableVouchersUseCase: GetAvailableVouchersUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createVoucher(@Body() dto: CreateVoucherDto) {
    return this.createVoucherUseCase.execute(dto);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateVoucher(@Body() dto: ValidateVoucherDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser | undefined;
    const customerId = dto.customer_id ?? user?.userId;

    const result = await this.validateVoucherUseCase.execute({
      code: dto.code,
      restaurant_id: dto.restaurant_id,
      subtotal: dto.subtotal,
      delivery_fee: dto.delivery_fee,
      customer_id: customerId,
    });

    return {
      is_valid: result.is_valid,
      voucher_id: result.voucher_id,
      code: result.code,
      name: result.name,
      voucher_type: result.voucher_type,
      sponsor_type: result.sponsor_type,
      discount_amount: result.discount_amount,
      final_subtotal: result.final_subtotal,
      final_delivery_fee: result.final_delivery_fee,
      final_total_amount: result.final_total_amount,
    };
  }

  @Get('available')
  async getAvailableVouchers(
    @Query('restaurant_id') restaurantId?: string,
    @Query('subtotal') subtotal?: string,
    @Req() req?: Request,
  ) {
    const user = req?.user as AuthenticatedUser | undefined;
    return this.getAvailableVouchersUseCase.execute({
      restaurant_id: restaurantId,
      subtotal: subtotal ? Number(subtotal) : 0,
      customer_id: user?.userId,
    });
  }

  @Post('internal/apply')
  @HttpCode(HttpStatus.OK)
  async internalApply(
    @Body()
    body: {
      code: string;
      order_id: string;
      customer_id: string;
      restaurant_id: string;
      subtotal: number;
      delivery_fee?: number;
    },
  ) {
    return this.applyVoucherUseCase.execute(body);
  }

  @Post('internal/revert')
  @HttpCode(HttpStatus.OK)
  async internalRevert(@Body() body: { order_id: string }) {
    return this.revertVoucherUseCase.execute(body.order_id);
  }
}
