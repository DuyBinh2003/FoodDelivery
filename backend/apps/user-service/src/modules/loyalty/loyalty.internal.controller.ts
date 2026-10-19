import { Controller, Post, Get, Body, Param, Inject } from '@nestjs/common';
import { BurnPointsUseCase } from '@/modules/loyalty/usecases/burn-points.usecase.js';
import { EarnPointsUseCase } from '@/modules/loyalty/usecases/earn-points.usecase.js';
import { RefundPointsUseCase } from '@/modules/loyalty/usecases/refund-points.usecase.js';
import { GetLoyaltyProfileUseCase } from '@/modules/loyalty/usecases/get-loyalty-profile.usecase.js';
import { BurnPointsDto } from '@/modules/loyalty/dtos/burn-points.dto.js';
import { EarnPointsDto } from '@/modules/loyalty/dtos/earn-points.dto.js';
import { RefundPointsDto } from '@/modules/loyalty/dtos/refund-points.dto.js';
import type { BurnPointsResult } from '@/modules/loyalty/usecases/burn-points.usecase.js';
import type { EarnPointsResult } from '@/modules/loyalty/usecases/earn-points.usecase.js';
import type { RefundPointsResult } from '@/modules/loyalty/usecases/refund-points.usecase.js';
import type { LoyaltyProfileResponse } from '@/modules/loyalty/usecases/get-loyalty-profile.usecase.js';

@Controller('internal/loyalty')
export class LoyaltyInternalController {
  constructor(
    @Inject(BurnPointsUseCase)
    private readonly burnPointsUseCase: BurnPointsUseCase,
    @Inject(EarnPointsUseCase)
    private readonly earnPointsUseCase: EarnPointsUseCase,
    @Inject(RefundPointsUseCase)
    private readonly refundPointsUseCase: RefundPointsUseCase,
    @Inject(GetLoyaltyProfileUseCase)
    private readonly getLoyaltyProfileUseCase: GetLoyaltyProfileUseCase,
  ) {}

  @Post('burn')
  async burnPoints(@Body() dto: BurnPointsDto): Promise<BurnPointsResult> {
    return this.burnPointsUseCase.execute(dto);
  }

  @Post('earn')
  async earnPoints(@Body() dto: EarnPointsDto): Promise<EarnPointsResult> {
    return this.earnPointsUseCase.execute(dto);
  }

  @Post('refund')
  async refundPoints(@Body() dto: RefundPointsDto): Promise<RefundPointsResult> {
    return this.refundPointsUseCase.execute(dto);
  }

  @Get('wallet/:userId')
  async getWallet(@Param('userId') userId: string): Promise<LoyaltyProfileResponse> {
    return this.getLoyaltyProfileUseCase.execute(userId);
  }
}
