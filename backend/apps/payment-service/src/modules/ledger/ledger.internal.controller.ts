import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { GetPlatformTreasuryUseCase } from '@/modules/ledger/usecases/get-platform-treasury.usecase.js';
import { SettleTripCommissionUseCase, SettleTripCommissionDto } from '@/modules/ledger/usecases/settle-trip-commission.usecase.js';

@Controller('internal/ledger')
export class LedgerInternalController {
  constructor(
    private readonly getPlatformTreasuryUseCase: GetPlatformTreasuryUseCase,
    private readonly settleTripCommissionUseCase: SettleTripCommissionUseCase,
  ) {}

  @Get('platform-summary')
  async getPlatformSummary(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.getPlatformTreasuryUseCase.execute({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post('settle-trip')
  async settleTripCommission(@Body() dto: SettleTripCommissionDto) {
    return this.settleTripCommissionUseCase.execute(dto);
  }
}
