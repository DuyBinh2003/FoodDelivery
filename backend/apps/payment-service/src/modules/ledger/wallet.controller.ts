import { Controller, Post, Get, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CreateWalletUseCase } from '@/modules/ledger/usecases/create-wallet.usecase.js';
import { GetWalletBalanceUseCase } from '@/modules/ledger/usecases/get-wallet-balance.usecase.js';
import { TopupWalletUseCase } from '@/modules/ledger/usecases/topup-wallet.usecase.js';
import { WithdrawalUseCase } from '@/modules/ledger/usecases/withdrawal.usecase.js';
import { CreateWalletDto } from '@/modules/ledger/dto/create-wallet.dto.js';
import { TopupWalletDto } from '@/modules/ledger/dto/topup-wallet.dto.js';
import { CreateWithdrawalDto } from '@/modules/ledger/dto/create-withdrawal.dto.js';
import { ApproveWithdrawalDto } from '@/modules/ledger/dto/approve-withdrawal.dto.js';
import { RejectWithdrawalDto } from '@/modules/ledger/dto/reject-withdrawal.dto.js';
import { OwnerType } from '@/modules/ledger/constants/ledger.enums.js';

@Controller('wallets')
export class WalletController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletBalanceUseCase: GetWalletBalanceUseCase,
    private readonly topupWalletUseCase: TopupWalletUseCase,
    private readonly withdrawalUseCase: WithdrawalUseCase,
  ) {}

  @Post()
  async createWallet(@Body() dto: CreateWalletDto) {
    return this.createWalletUseCase.execute(dto);
  }

  @Get('owner/:ownerId')
  async getWalletByOwner(
    @Param('ownerId', ParseUUIDPipe) ownerId: string,
    @Query('ownerType') ownerType?: OwnerType,
  ) {
    return this.getWalletBalanceUseCase.executeByOwner(ownerId, ownerType || OwnerType.CUSTOMER);
  }

  @Get('withdrawals')
  async getWithdrawals(
    @Query('requesterId') requesterId?: string,
    @Query('walletAccountId') walletAccountId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.withdrawalUseCase.getWithdrawals({
      requesterId,
      walletAccountId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('withdrawals/:id')
  async getWithdrawalById(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalUseCase.getWithdrawalById(id);
  }

  @Post('withdraw')
  async requestWithdrawal(@Body() dto: CreateWithdrawalDto) {
    return this.withdrawalUseCase.requestWithdrawal(dto);
  }

  @Patch('withdrawals/:id/approve')
  async approveWithdrawal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveWithdrawalDto,
  ) {
    return this.withdrawalUseCase.approveWithdrawal(id, dto);
  }

  @Patch('withdrawals/:id/reject')
  async rejectWithdrawal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectWithdrawalDto,
  ) {
    return this.withdrawalUseCase.rejectWithdrawal(id, dto);
  }

  @Get(':id')
  async getWalletBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.getWalletBalanceUseCase.execute(id);
  }

  @Post('topup')
  async topupWallet(@Body() dto: TopupWalletDto) {
    return this.topupWalletUseCase.execute(dto);
  }
}
