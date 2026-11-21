import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Decimal } from 'decimal.js';
import { WithdrawalRequest } from '@/modules/ledger/entities/withdrawal-request.entity.js';
import { WalletBalance } from '@/modules/ledger/entities/wallet-balance.entity.js';
import { WalletAccount } from '@/modules/ledger/entities/wallet-account.entity.js';
import { LedgerTransaction } from '@/modules/ledger/entities/ledger-transaction.entity.js';
import { LedgerEntry } from '@/modules/ledger/entities/ledger-entry.entity.js';
import { CreateWithdrawalDto } from '@/modules/ledger/dto/create-withdrawal.dto.js';
import { ApproveWithdrawalDto } from '@/modules/ledger/dto/approve-withdrawal.dto.js';
import { RejectWithdrawalDto } from '@/modules/ledger/dto/reject-withdrawal.dto.js';
import { WithdrawalStatus, AccountCategory, EntryType, TransactionStatus, ReferenceType } from '@/modules/ledger/constants/ledger.enums.js';
import { WalletWriteRepository } from '@/modules/ledger/repositories/wallet.write.repository.js';

export interface WithdrawalFilterQuery {
  requesterId?: string;
  walletAccountId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class WithdrawalUseCase {
  private readonly logger = new Logger(WithdrawalUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WithdrawalRequest)
    private readonly withdrawalRepo: Repository<WithdrawalRequest>,
    private readonly walletWriteRepo: WalletWriteRepository,
  ) {}

  /**
   * Phase 1: Tạo yêu cầu rút tiền & Đóng băng số dư (Balance Hold)
   */
  async requestWithdrawal(dto: CreateWithdrawalDto): Promise<WithdrawalRequest> {
    const amountNum = Number(dto.amount);
    if (isNaN(amountNum) || amountNum < 50000) {
      throw new BadRequestException('Số tiền rút tối thiểu là 50.000 VND');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Kiểm tra ví tài khoản
      const wallet = await queryRunner.manager.findOne(WalletAccount, {
        where: { id: dto.wallet_account_id, is_deleted: false },
      });
      if (!wallet) {
        throw new NotFoundException(`Không tìm thấy thông tin ví: ${dto.wallet_account_id}`);
      }

      // 2. Lock bi quan dòng số dư (SELECT FOR UPDATE)
      const balance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.wallet_account_id = :walletId', { walletId: wallet.id })
        .getOne();

      if (!balance) {
        throw new NotFoundException(`Không tìm thấy bảng số dư cho ví: ${wallet.id}`);
      }

      const available = new Decimal(balance.available_balance);
      const locked = new Decimal(balance.locked_balance);
      const withdrawAmount = new Decimal(dto.amount);

      // 3. Kiểm tra số dư khả dụng
      if (available.lessThan(withdrawAmount)) {
        throw new BadRequestException(
          `Số dư khả dụng không đủ để thực hiện giao dịch rút tiền. Khả dụng: ${available.toString()} VND, yêu cầu: ${withdrawAmount.toString()} VND`,
        );
      }

      // 4. Khóa số dư: Trừ available_balance, tăng locked_balance
      const newAvailable = available.minus(withdrawAmount);
      const newLocked = locked.plus(withdrawAmount);

      balance.available_balance = newAvailable.toString();
      balance.locked_balance = newLocked.toString();
      balance.version = (BigInt(balance.version) + 1n).toString();
      await queryRunner.manager.save(balance);

      // 5. Tạo bản ghi yêu cầu rút tiền PENDING
      const fee = new Decimal(0); // Miễn phí rút
      const netAmount = withdrawAmount.minus(fee);

      const withdrawal = queryRunner.manager.create(WithdrawalRequest, {
        wallet_account_id: wallet.id,
        requester_id: dto.requester_id,
        requester_type: dto.requester_type,
        amount: withdrawAmount.toString(),
        fee: fee.toString(),
        net_amount: netAmount.toString(),
        bank_code: dto.bank_code.toUpperCase().trim(),
        bank_account_number: dto.bank_account_number.trim(),
        bank_account_name: dto.bank_account_name.toUpperCase().trim(),
        status: WithdrawalStatus.PENDING,
      });

      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      await queryRunner.commitTransaction();
      this.logger.log(
        `[RequestWithdrawal] Created withdrawal ${savedWithdrawal.id} for ${dto.requester_type} ${dto.requester_id}, amount: ${withdrawAmount.toString()} VND`,
      );
      return savedWithdrawal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('[RequestWithdrawal] Failed to process withdrawal request:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Phase 2: Phê duyệt rút tiền & Quyết toán Sổ cái kép (Settlement)
   */
  async approveWithdrawal(withdrawalId: string, dto: ApproveWithdrawalDto): Promise<WithdrawalRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await queryRunner.manager.findOne(WithdrawalRequest, {
        where: { id: withdrawalId, is_deleted: false },
      });

      if (!withdrawal) {
        throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền: ${withdrawalId}`);
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING && withdrawal.status !== WithdrawalStatus.PROCESSING) {
        throw new ConflictException(`Yêu cầu rút tiền không ở trạng thái chờ duyệt (Hiện tại: ${withdrawal.status})`);
      }

      // 1. Lock và giảm số dư locked_balance
      const balance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.wallet_account_id = :walletId', { walletId: withdrawal.wallet_account_id })
        .getOne();

      if (!balance) {
        throw new NotFoundException(`Không tìm thấy số dư cho ví: ${withdrawal.wallet_account_id}`);
      }

      const locked = new Decimal(balance.locked_balance);
      const amount = new Decimal(withdrawal.amount);

      if (locked.lessThan(amount)) {
        throw new BadRequestException('Số dư đóng băng không đủ để hoàn tất quyết toán');
      }

      balance.locked_balance = locked.minus(amount).toString();
      balance.version = (BigInt(balance.version) + 1n).toString();
      await queryRunner.manager.save(balance);

      // 2. Cập nhật trạng thái lệnh rút
      withdrawal.status = WithdrawalStatus.COMPLETED;
      withdrawal.bank_transaction_ref = dto.bank_transaction_ref;
      if (dto.processed_by) {
        withdrawal.processed_by = dto.processed_by;
      }
      withdrawal.processed_at = new Date();
      const updatedWithdrawal = await queryRunner.manager.save(withdrawal);

      // 3. Ghi sổ cái kép (Double-Entry Ledger)
      // Lấy hoặc tạo tài khoản tài sản ngân hàng của hệ thống (SYS_ASSET_BANK)
      const bankAssetAccount = await this.walletWriteRepo.getOrCreateSystemAccount(
        'SYS_ASSET_BANK',
        AccountCategory.ASSET,
      );

      const txnCode = `WD-${withdrawal.id.slice(0, 8)}-${Date.now()}`;
      const idempotencyKey = `WITHDRAWAL-SETTLE-${withdrawal.id}`;

      const ledgerTxn = queryRunner.manager.create(LedgerTransaction, {
        transaction_code: txnCode,
        reference_type: ReferenceType.WITHDRAWAL,
        reference_id: withdrawal.id,
        status: TransactionStatus.POSTED,
        description: `Quyết toán rút tiền ngân hàng ${withdrawal.bank_code} STK ${withdrawal.bank_account_number} (Ref: ${dto.bank_transaction_ref})`,
        idempotency_key: idempotencyKey,
      });
      const savedTxn = await queryRunner.manager.save(ledgerTxn);

      // DEBIT ví đối tác (Liability giảm) & CREDIT tài khoản ngân hàng sàn (Asset giảm)
      const debitEntry = queryRunner.manager.create(LedgerEntry, {
        ledger_transaction_id: savedTxn.id,
        wallet_account_id: withdrawal.wallet_account_id,
        entry_type: EntryType.DEBIT,
        amount: withdrawal.amount,
        currency: 'VND',
        balance_after: balance.available_balance, // available_balance đã trừ lúc Hold
        sequence_num: 1,
      });

      const creditEntry = queryRunner.manager.create(LedgerEntry, {
        ledger_transaction_id: savedTxn.id,
        wallet_account_id: bankAssetAccount.id,
        entry_type: EntryType.CREDIT,
        amount: withdrawal.amount,
        currency: 'VND',
        balance_after: '0',
        sequence_num: 2,
      });

      await queryRunner.manager.save([debitEntry, creditEntry]);

      await queryRunner.commitTransaction();
      this.logger.log(`[ApproveWithdrawal] Successfully approved withdrawal ${withdrawal.id}`);
      return updatedWithdrawal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('[ApproveWithdrawal] Failed to approve withdrawal:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Nhánh từ chối: Hoàn trả số dư đóng băng về available_balance
   */
  async rejectWithdrawal(withdrawalId: string, dto: RejectWithdrawalDto): Promise<WithdrawalRequest> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await queryRunner.manager.findOne(WithdrawalRequest, {
        where: { id: withdrawalId, is_deleted: false },
      });

      if (!withdrawal) {
        throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền: ${withdrawalId}`);
      }

      if (withdrawal.status !== WithdrawalStatus.PENDING && withdrawal.status !== WithdrawalStatus.PROCESSING) {
        throw new ConflictException(`Yêu cầu rút tiền không ở trạng thái chờ duyệt (Hiện tại: ${withdrawal.status})`);
      }

      // 1. Lock và hoàn trả số dư từ locked_balance về available_balance
      const balance = await queryRunner.manager
        .createQueryBuilder(WalletBalance, 'wb')
        .setLock('pessimistic_write')
        .where('wb.wallet_account_id = :walletId', { walletId: withdrawal.wallet_account_id })
        .getOne();

      if (!balance) {
        throw new NotFoundException(`Không tìm thấy số dư cho ví: ${withdrawal.wallet_account_id}`);
      }

      const locked = new Decimal(balance.locked_balance);
      const available = new Decimal(balance.available_balance);
      const amount = new Decimal(withdrawal.amount);

      balance.locked_balance = locked.minus(amount).toString();
      balance.available_balance = available.plus(amount).toString();
      balance.version = (BigInt(balance.version) + 1n).toString();
      await queryRunner.manager.save(balance);

      // 2. Cập nhật thông tin từ chối
      withdrawal.status = WithdrawalStatus.REJECTED;
      withdrawal.rejection_reason = dto.rejection_reason;
      if (dto.processed_by) {
        withdrawal.processed_by = dto.processed_by;
      }
      withdrawal.processed_at = new Date();
      const updatedWithdrawal = await queryRunner.manager.save(withdrawal);

      await queryRunner.commitTransaction();
      this.logger.log(`[RejectWithdrawal] Successfully rejected withdrawal ${withdrawal.id}, balance refunded`);
      return updatedWithdrawal;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('[RejectWithdrawal] Failed to reject withdrawal:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Danh sách yêu cầu rút tiền kèm phân trang và bộ lọc
   */
  async getWithdrawals(filter: WithdrawalFilterQuery = {}) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const skip = (page - 1) * limit;

    const queryBuilder = this.withdrawalRepo.createQueryBuilder('w')
      .where('w.is_deleted = :isDeleted', { isDeleted: false });

    if (filter.requesterId) {
      queryBuilder.andWhere('w.requester_id = :requesterId', { requesterId: filter.requesterId });
    }

    if (filter.walletAccountId) {
      queryBuilder.andWhere('w.wallet_account_id = :walletAccountId', { walletAccountId: filter.walletAccountId });
    }

    if (filter.status && filter.status !== 'ALL') {
      queryBuilder.andWhere('w.status = :status', { status: filter.status });
    }

    queryBuilder.orderBy('w.created_at', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getWithdrawalById(id: string): Promise<WithdrawalRequest> {
    const withdrawal = await this.withdrawalRepo.findOne({
      where: { id, is_deleted: false },
    });
    if (!withdrawal) {
      throw new NotFoundException(`Không tìm thấy yêu cầu rút tiền: ${id}`);
    }
    return withdrawal;
  }
}
