import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { LoyaltyWallet } from '@/modules/loyalty/entities/loyalty-wallet.entity.js';
import { LoyaltyTransaction } from '@/modules/loyalty/entities/loyalty-transaction.entity.js';
import { LoyaltyRepository } from '@/modules/loyalty/repositories/loyalty.repository.js';
import { BurnPointsUseCase } from '@/modules/loyalty/usecases/burn-points.usecase.js';
import { EarnPointsUseCase } from '@/modules/loyalty/usecases/earn-points.usecase.js';
import { RefundPointsUseCase } from '@/modules/loyalty/usecases/refund-points.usecase.js';
import { GetLoyaltyProfileUseCase } from '@/modules/loyalty/usecases/get-loyalty-profile.usecase.js';
import { LoyaltyController } from '@/modules/loyalty/loyalty.controller.js';
import { LoyaltyInternalController } from '@/modules/loyalty/loyalty.internal.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoyaltyWallet, LoyaltyTransaction]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [LoyaltyController, LoyaltyInternalController],
  providers: [
    LoyaltyRepository,
    BurnPointsUseCase,
    EarnPointsUseCase,
    RefundPointsUseCase,
    GetLoyaltyProfileUseCase,
  ],
  exports: [
    LoyaltyRepository,
    BurnPointsUseCase,
    EarnPointsUseCase,
    RefundPointsUseCase,
    GetLoyaltyProfileUseCase,
  ],
})
export class LoyaltyModule {}
