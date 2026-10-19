import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { LoyaltyRepository } from '@/modules/loyalty/repositories/loyalty.repository.js';
import { LoyaltyTransactionType, LoyaltyReferenceType } from '@/modules/loyalty/enums/loyalty-transaction-type.enum.js';
import type { BurnPointsDto } from '@/modules/loyalty/dtos/burn-points.dto.js';

export interface BurnPointsResult {
  success: boolean;
  points_burned: number;
  discount_amount: number;
  remaining_points: number;
  transaction_id: string;
}

@Injectable()
export class BurnPointsUseCase {
  private readonly logger = new Logger(BurnPointsUseCase.name);
  public static readonly POINT_RATE_VND = 10; // 1 điểm = 10 VND

  constructor(private readonly loyaltyRepo: LoyaltyRepository) {}

  async execute(dto: BurnPointsDto): Promise<BurnPointsResult> {
    const { user_id, order_id, points, max_discount_amount, idempotency_key } = dto;

    if (points < 100) {
      throw new BadRequestException('Số điểm quy đổi tối thiểu là 100 điểm');
    }

    // 1. Kiểm tra tính lũy đẳng (Idempotency Check)
    const existingTx = await this.loyaltyRepo.findTransactionByIdempotencyKey(idempotency_key);
    if (existingTx) {
      this.logger.log(`Idempotent request detected for key: ${idempotency_key}`);
      const wallet = await this.loyaltyRepo.getOrCreateWallet(user_id);
      return {
        success: true,
        points_burned: Math.abs(existingTx.points),
        discount_amount: Math.abs(existingTx.points) * BurnPointsUseCase.POINT_RATE_VND,
        remaining_points: wallet.available_points,
        transaction_id: existingTx.id,
      };
    }

    // 2. Kiểm tra giới hạn trần giảm giá (Max 50% Subtotal)
    const requestedDiscount = points * BurnPointsUseCase.POINT_RATE_VND;
    if (max_discount_amount !== undefined && requestedDiscount > max_discount_amount) {
      const allowedPoints = Math.floor(max_discount_amount / BurnPointsUseCase.POINT_RATE_VND);
      throw new BadRequestException(
        `Số điểm sử dụng (${points} điểm) vượt quá trần giảm giá cho phép (${allowedPoints} điểm)`,
      );
    }

    // 3. Khởi tạo hoặc lấy ví điểm
    const wallet = await this.loyaltyRepo.getOrCreateWallet(user_id);

    // 4. Kiểm tra số dư điểm khả dụng
    if (wallet.available_points < points) {
      throw new BadRequestException(
        `Số điểm tích lũy không đủ (Hiện có: ${wallet.available_points}, Cần: ${points})`,
      );
    }

    // 5. Thực hiện trừ điểm và ghi sổ cái bất biến (Append-Only)
    wallet.available_points -= points;
    await this.loyaltyRepo.saveWallet(wallet);

    const tx = await this.loyaltyRepo.recordTransaction({
      wallet_id: wallet.id,
      user_id,
      transaction_type: LoyaltyTransactionType.REDEEM_ORDER,
      points: -points,
      balance_after: wallet.available_points,
      reference_type: LoyaltyReferenceType.ORDER,
      reference_id: order_id,
      idempotency_key,
      description: `Sử dụng ${points} điểm giảm ${requestedDiscount.toLocaleString('vi-VN')} VND cho đơn hàng #${order_id}`,
    });

    return {
      success: true,
      points_burned: points,
      discount_amount: requestedDiscount,
      remaining_points: wallet.available_points,
      transaction_id: tx.id,
    };
  }
}
