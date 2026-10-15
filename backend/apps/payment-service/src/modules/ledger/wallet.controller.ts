import { Controller, Post, Get, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { CreateWalletUseCase } from '@/modules/ledger/usecases/create-wallet.usecase.js';
import { GetWalletBalanceUseCase } from '@/modules/ledger/usecases/get-wallet-balance.usecase.js';
import { TopupWalletUseCase } from '@/modules/ledger/usecases/topup-wallet.usecase.js';
import { CreateWalletDto } from '@/modules/ledger/dto/create-wallet.dto.js';
import { TopupWalletDto } from '@/modules/ledger/dto/topup-wallet.dto.js';
import { OwnerType } from '@/modules/ledger/constants/ledger.enums.js';

@Controller('wallets')
export class WalletController {
  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly getWalletBalanceUseCase: GetWalletBalanceUseCase,
    private readonly topupWalletUseCase: TopupWalletUseCase,
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

  @Get(':id')
  async getWalletBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.getWalletBalanceUseCase.execute(id);
  }

  @Post('topup')
  async topupWallet(@Body() dto: TopupWalletDto) {
    return this.topupWalletUseCase.execute(dto);
  }
}
