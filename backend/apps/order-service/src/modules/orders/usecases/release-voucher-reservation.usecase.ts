import { Injectable, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { PromotionRedisRepository } from '@/modules/orders/repositories/promotion.redis.repository.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';

export interface ReleaseVoucherInput {
  orderId: string;
  customerId: string;
}

@Injectable()
export class ReleaseVoucherReservationUseCase {
  private readonly logger = new Logger(ReleaseVoucherReservationUseCase.name);

  constructor(
    private readonly voucherRepo: VoucherRepository,
    private readonly promoRedisRepo: PromotionRedisRepository,
  ) {}

  async execute(input: ReleaseVoucherInput): Promise<{ success: boolean; released_count: number }> {
    const { orderId, customerId } = input;

    const reservations = await this.voucherRepo.findReservationsByOrder(orderId);
    if (!reservations || reservations.length === 0) {
      return { success: true, released_count: 0 };
    }

    const voucherIds: string[] = [];

    for (const res of reservations) {
      voucherIds.push(res.voucher_id);
      // Hoàn lại trạng thái AVAILABLE cho voucher trong ví người dùng
      await this.voucherRepo.updateUserVoucherStatus(customerId, res.voucher_id, UserVoucherStatus.AVAILABLE);
    }

    // Cập nhật trạng thái reservation sang RELEASED
    await this.voucherRepo.releaseReservations(orderId);

    // Xóa khóa trên Redis
    await this.promoRedisRepo.releaseReservation(orderId, voucherIds, customerId);

    this.logger.log(`Two-Phase Reservation RELEASED for order ${orderId} (${reservations.length} vouchers returned to wallet)`);

    return {
      success: true,
      released_count: reservations.length,
    };
  }
}
