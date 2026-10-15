import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';
import { WalletReadRepository } from '@/modules/ledger/repositories/wallet.read.repository.js';
import { CreateWalletDto } from '@/modules/ledger/dto/create-wallet.dto.js';
import { WalletAccount } from '@/modules/ledger/entities/wallet-account.entity.js';
import { WalletBalance } from '@/modules/ledger/entities/wallet-balance.entity.js';

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject(WalletWriteRepository)
    private readonly walletWriteRepo: WalletWriteRepository,
    @Inject(WalletReadRepository)
    private readonly walletReadRepo: WalletReadRepository,
  ) {}

  async execute(dto: CreateWalletDto): Promise<{ wallet: WalletAccount; balance: WalletBalance }> {
    const existing = await this.walletReadRepo.getWalletByCode(dto.accountCode);
    if (existing) {
      throw new ConflictException(`Wallet account with code '${dto.accountCode}' already exists`);
    }

    return this.walletWriteRepo.createWalletWithBalance({
      ownerId: dto.ownerId,
      ownerType: dto.ownerType,
      accountCategory: dto.accountCategory,
      accountCode: dto.accountCode,
      currency: dto.currency || 'VND',
    });
  }
}
