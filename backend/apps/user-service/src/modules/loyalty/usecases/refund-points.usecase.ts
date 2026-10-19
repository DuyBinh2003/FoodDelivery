import { Injectable, Logger } from '@nestjs/common';
import { LoyaltyRepository } from '@/modules/loyalty/repositories/loyalty.repository.js';
import { LoyaltyTransactionType, LoyaltyReferenceType } from '@/modules/loyalty/enums/loyalty-transaction-type.enum.js';
import type { RefundPointsDto } from '@/modules/loyalty/dtos/refund-points.dto.js';

export interface RefundPointsResult {
  success: boolean;
  points_refunded: number;
  remaining_points: number;
  transaction_id?: string;
}

@Injectable()
export class RefundPointsUseCase {
  private readonly logger = new Logger(RefundPointsUseCase.name);

  constructor(private readonly loyaltyRepo: LoyaltyRepository) {}

  async execute(dto: RefundPointsDto): Promise<RefundPointsResult> {
    const { user_id, order_id, idempotency_key } = dto;

    // 1. Kiểm tra tính lũy đẳng (Idempotency)
    const existingTx = await this.loyaltyRepo.findTransactionByIdempotencyKey(idempotency_key);
    if (existingTx) {
      this.logger.log(`Idempotent refund request detected for key: ${idempotency_key}`);
      const wallet = await this.loyaltyRepo.getOrCreateWallet(user_id);
      return {
        success: true,
        points_refunded: existingTx.points,
        remaining_points: wallet.available_points,
        transaction_id: existingTx.id,
      };
    }

    // 2. Tìm giao dịch tiêu điểm gốc của đơn hàng này
    const recentTxs = await this.loyaltyRepo.getRecentTransactions(user_id, 100);
    const originalBurnTx = recentTxs.find(
      (tx) =>
        tx.reference_type === LoyaltyReferenceType.ORDER &&
        tx.reference_id === order_id &&
        tx.transaction_type === LoyaltyTransactionType.REDEEM_ORDER,
    );

    const wallet = await this.loyaltyRepo.getOrCreateWallet(user_id);

    // Nếu đơn hàng này không sử dụng điểm thì không cần hoàn điểm (No-op an toàn)
    if (!originalBurnTx) {
      this.logger.log(`Order #${order_id} did not use points. No refund needed.`);
      return {
        success: true,
        points_refunded: 0,
        remaining_points: wallet.available_points,
      };
    }

    const pointsToRefund = Math.abs(originalBurnTx.points);

    // 3. Hoàn lại số điểm khả dụng vào ví
    wallet.available_points += pointsToRefund;
    await this.loyaltyRepo.saveWallet(wallet);

    // 4. Ghi nhận bút toán hoàn điểm (REFUND)
    const tx = await this.loyaltyRepo.recordTransaction({
      wallet_id: wallet.id,
      user_id,
      transaction_type: LoyaltyTransactionType.REFUND,
      points: pointsToRefund,
      balance_after: wallet.available_points,
      reference_type: LoyaltyReferenceType.ORDER,
      reference_id: order_id,
      idempotency_key,
      description: `Hoàn trả ${pointsToRefund} điểm do đơn hàng #${order_id} bị hủy`,
    });

    return {
      success: true,
      points_refunded: pointsToRefund,
      remaining_points: wallet.available_points,
      transaction_id: tx.id,
    };
  }
}
