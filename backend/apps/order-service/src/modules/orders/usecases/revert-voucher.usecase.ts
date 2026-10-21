import { Injectable, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { VoucherUsageStatus } from '@/modules/orders/enums/voucher-usage-status.enum.js';

@Injectable()
export class RevertVoucherUseCase {
  private readonly logger = new Logger(RevertVoucherUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(orderId: string): Promise<{ reverted: boolean; voucherId?: string; refundedDiscount?: number }> {
    const usage = await this.voucherRepo.findUsageByOrder(orderId);
    if (!usage || usage.status !== VoucherUsageStatus.APPLIED) {
      this.logger.debug(`[RevertVoucher] No active voucher usage found for order ${orderId}`);
      return { reverted: false };
    }

    await this.voucherRepo.revertUsage(usage.id);
    await this.voucherRepo.atomicDecrementUsedQuantity(usage.voucher_id);

    this.logger.log(
      `[RevertVoucher] Successfully reverted voucher ${usage.voucher_id} for cancelled order ${orderId} (+1 quantity returned)`,
    );

    return {
      reverted: true,
      voucherId: usage.voucher_id,
      refundedDiscount: Number(usage.discount_amount),
    };
  }
}
