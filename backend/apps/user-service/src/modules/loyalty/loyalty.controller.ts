import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard.js';
import { RolesGuard } from '@/common/guards/roles.guard.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { GetLoyaltyProfileUseCase } from '@/modules/loyalty/usecases/get-loyalty-profile.usecase.js';
import type { LoyaltyProfileResponse } from '@/modules/loyalty/usecases/get-loyalty-profile.usecase.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  [key: string]: unknown;
}

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(
    @Inject(GetLoyaltyProfileUseCase)
    private readonly getLoyaltyProfileUseCase: GetLoyaltyProfileUseCase,
  ) {}

  @Get('my-points')
  async getMyPoints(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LoyaltyProfileResponse> {
    return this.getLoyaltyProfileUseCase.execute(user.id);
  }
}
