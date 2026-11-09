import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateVoucherUseCase } from '@/modules/orders/usecases/create-voucher.usecase.js';
import { ValidateVoucherUseCase } from '@/modules/orders/usecases/validate-voucher.usecase.js';
import { ApplyVoucherUseCase } from '@/modules/orders/usecases/apply-voucher.usecase.js';
import { RevertVoucherUseCase } from '@/modules/orders/usecases/revert-voucher.usecase.js';
import { GetAvailableVouchersUseCase } from '@/modules/orders/usecases/get-available-vouchers.usecase.js';
import { ClaimVoucherUseCase } from '@/modules/orders/usecases/claim-voucher.usecase.js';
import { GetUserVoucherWalletUseCase } from '@/modules/orders/usecases/get-user-voucher-wallet.usecase.js';
import { GetVoucherFeedUseCase } from '@/modules/orders/usecases/get-voucher-feed.usecase.js';
import { RecommendBestComboUseCase } from '@/modules/orders/usecases/recommend-best-combo.usecase.js';
import { ReserveVouchersUseCase } from '@/modules/orders/usecases/reserve-vouchers.usecase.js';
import { CommitVoucherReservationUseCase } from '@/modules/orders/usecases/commit-voucher-reservation.usecase.js';
import { ReleaseVoucherReservationUseCase } from '@/modules/orders/usecases/release-voucher-reservation.usecase.js';
import { CreateCampaignUseCase } from '@/modules/orders/usecases/create-campaign.usecase.js';
import { EmergencyKillCampaignUseCase } from '@/modules/orders/usecases/emergency-kill-campaign.usecase.js';
import { GetCampaignBurnRateUseCase } from '@/modules/orders/usecases/get-campaign-burn-rate.usecase.js';
import { JoinCoFundedCampaignUseCase } from '@/modules/orders/usecases/join-co-funded-campaign.usecase.js';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { CreateVoucherDto } from '@/modules/orders/dto/create-voucher.dto.js';
import { ValidateVoucherDto } from '@/modules/orders/dto/validate-voucher.dto.js';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';
import { CampaignSponsor } from '@/modules/orders/enums/campaign-sponsor.enum.js';

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
    private readonly claimVoucherUseCase: ClaimVoucherUseCase,
    private readonly getUserVoucherWalletUseCase: GetUserVoucherWalletUseCase,
    private readonly getVoucherFeedUseCase: GetVoucherFeedUseCase,
    private readonly recommendBestComboUseCase: RecommendBestComboUseCase,
    private readonly reserveVouchersUseCase: ReserveVouchersUseCase,
    private readonly commitVoucherReservationUseCase: CommitVoucherReservationUseCase,
    private readonly releaseVoucherReservationUseCase: ReleaseVoucherReservationUseCase,
    private readonly createCampaignUseCase: CreateCampaignUseCase,
    private readonly emergencyKillCampaignUseCase: EmergencyKillCampaignUseCase,
    private readonly getCampaignBurnRateUseCase: GetCampaignBurnRateUseCase,
    private readonly joinCoFundedCampaignUseCase: JoinCoFundedCampaignUseCase,
    private readonly voucherRepo: VoucherRepository,
  ) {}

  // --- 1. ENTERPRISE CUSTOMER ENDPOINTS ---
  @Get('wallet')
  @UseGuards(JwtAuthGuard)
  async getWallet(
    @Req() req: Request,
    @Query('status') status?: UserVoucherStatus,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.getUserVoucherWalletUseCase.execute(user.userId, status);
  }

  @Get('feed')
  async getFeed(@Req() req: Request) {
    const user = req.user as AuthenticatedUser | undefined;
    return this.getVoucherFeedUseCase.execute(user?.userId);
  }

  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async claimVoucher(
    @Param('id') voucherId: string,
    @Req() req: Request,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.claimVoucherUseCase.execute({
      voucherId,
      userId: user.userId,
      deviceFingerprint: deviceFingerprint || 'unknown_device',
    });
  }

  @Post('recommend-best-combo')
  @HttpCode(HttpStatus.OK)
  async recommendBestCombo(
    @Body()
    body: {
      customer_id?: string;
      restaurant_id: string;
      subtotal: number;
      delivery_fee?: number;
      payment_method?: string;
      voucher_codes?: string[];
    },
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser | undefined;
    const customerId = body.customer_id ?? user?.userId;

    return this.recommendBestComboUseCase.execute({
      customerId,
      restaurantId: body.restaurant_id,
      subtotal: Number(body.subtotal || 0),
      deliveryFee: Number(body.delivery_fee || 0),
      paymentMethod: body.payment_method || 'COD',
      voucherCodes: body.voucher_codes,
    });
  }

  // --- 2. TWO-PHASE RESERVATION ENDPOINTS ---
  @Post('internal/reserve')
  @HttpCode(HttpStatus.OK)
  async reserveVouchers(
    @Body()
    body: {
      order_id: string;
      user_id: string;
      voucher_ids: string[];
      subtotal: number;
      delivery_fee: number;
    },
  ) {
    return this.reserveVouchersUseCase.execute({
      orderId: body.order_id,
      userId: body.user_id,
      voucherIds: body.voucher_ids,
      subtotal: Number(body.subtotal || 0),
      deliveryFee: Number(body.delivery_fee || 0),
    });
  }

  @Post('internal/commit')
  @HttpCode(HttpStatus.OK)
  async commitReservation(
    @Body()
    body: {
      order_id: string;
      customer_id: string;
      restaurant_id?: string;
    },
  ) {
    return this.commitVoucherReservationUseCase.execute({
      orderId: body.order_id,
      customerId: body.customer_id,
      restaurantId: body.restaurant_id,
    });
  }

  @Post('internal/release')
  @HttpCode(HttpStatus.OK)
  async releaseReservation(
    @Body()
    body: {
      order_id: string;
      customer_id: string;
    },
  ) {
    return this.releaseVoucherReservationUseCase.execute({
      orderId: body.order_id,
      customerId: body.customer_id,
    });
  }

  // --- 3. CAMPAIGN, ADMIN & PARTNER ENDPOINTS ---
  @Post('campaigns')
  @UseGuards(JwtAuthGuard)
  async createCampaign(
    @Body()
    body: {
      code: string;
      name: string;
      sponsor_type: CampaignSponsor;
      platform_share_ratio?: number;
      merchant_share_ratio?: number;
      partner_share_ratio?: number;
      total_budget_amount: number;
      start_time: string;
      end_time: string;
    },
  ) {
    return this.createCampaignUseCase.execute({
      code: body.code,
      name: body.name,
      sponsorType: body.sponsor_type,
      platformShareRatio: body.platform_share_ratio,
      merchantShareRatio: body.merchant_share_ratio,
      partnerShareRatio: body.partner_share_ratio,
      totalBudgetAmount: Number(body.total_budget_amount),
      startTime: new Date(body.start_time),
      endTime: new Date(body.end_time),
    });
  }

  @Get('campaigns')
  async getCampaigns() {
    return this.voucherRepo.getAllCampaigns();
  }

  @Get('campaigns/:id/burn-rate')
  async getCampaignBurnRate(@Param('id') campaignId: string) {
    return this.getCampaignBurnRateUseCase.execute(campaignId);
  }

  @Post('campaigns/:id/emergency-kill')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async emergencyKillCampaign(@Param('id') campaignId: string) {
    return this.emergencyKillCampaignUseCase.execute(campaignId);
  }

  @Post('campaigns/:id/join')
  @UseGuards(JwtAuthGuard)
  async joinCoFundedCampaign(
    @Param('id') campaignId: string,
    @Body() body: { restaurant_id: string; merchant_budget_cap: number },
  ) {
    if (!body.restaurant_id || !body.merchant_budget_cap) {
      throw new BadRequestException('Vui lòng cung cấp restaurant_id và merchant_budget_cap');
    }
    return this.joinCoFundedCampaignUseCase.execute({
      campaignId,
      restaurantId: body.restaurant_id,
      merchantBudgetCap: Number(body.merchant_budget_cap),
    });
  }

  // --- 4. LEGACY VOUCHER ENDPOINTS (BACKWARD COMPATIBILITY) ---
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
