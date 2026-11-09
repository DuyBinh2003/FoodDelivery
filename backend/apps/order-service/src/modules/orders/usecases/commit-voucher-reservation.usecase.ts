import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { PromotionRedisRepository } from '@/modules/orders/repositories/promotion.redis.repository.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';
import { CampaignSponsor } from '@/modules/orders/enums/campaign-sponsor.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';

export interface CommitVoucherInput {
  orderId: string;
  customerId: string;
  restaurantId?: string;
}

export interface CommitVoucherOutput {
  success: boolean;
  order_id: string;
  committed_vouchers_count: number;
  total_discount_amount: number;
}

@Injectable()
export class CommitVoucherReservationUseCase {
  private readonly logger = new Logger(CommitVoucherReservationUseCase.name);

  constructor(
    private readonly voucherRepo: VoucherRepository,
    private readonly promoRedisRepo: PromotionRedisRepository,
  ) {}

  async execute(input: CommitVoucherInput): Promise<CommitVoucherOutput> {
    const { orderId, customerId, restaurantId } = input;

    const reservations = await this.voucherRepo.findReservationsByOrder(orderId);
    if (!reservations || reservations.length === 0) {
      throw new NotFoundException(`Không tìm thấy phiên giữ chỗ voucher cho đơn hàng ${orderId}`);
    }

    let totalDiscount = 0;
    const voucherIds: string[] = [];

    for (const res of reservations) {
      const v = res.voucher;
      voucherIds.push(res.voucher_id);
      const discount = Number(res.discount_amount);
      totalDiscount += discount;

      // 1. Tăng atomic used_quantity
      await this.voucherRepo.atomicIncrementUsedQuantity(res.voucher_id);

      // 2. Tính toán phân bổ tài trợ Co-Funded
      let platformFunded = 0;
      let merchantFunded = 0;
      let partnerFunded = 0;

      if (v.campaign && v.campaign.sponsor_type === CampaignSponsor.CO_FUNDED) {
        platformFunded = Math.round((discount * Number(v.campaign.platform_share_ratio)) / 100);
        merchantFunded = Math.round((discount * Number(v.campaign.merchant_share_ratio)) / 100);
        partnerFunded = discount - platformFunded - merchantFunded;

        // Cập nhật ngân sách chiến dịch
        await this.voucherRepo.updateCampaignSpent(v.campaign.id, discount);

        // Kiểm tra và cập nhật Merchant Budget Cap nếu có
        const restId = restaurantId || v.restaurant_id || v.target_restaurant_id;
        if (restId) {
          await this.voucherRepo.updateMerchantBudgetSpent(v.campaign.id, restId, merchantFunded);
        }
      } else if (v.sponsor_type === VoucherSponsor.PLATFORM) {
        platformFunded = discount;
      } else if (v.sponsor_type === VoucherSponsor.MERCHANT) {
        merchantFunded = discount;
      } else {
        partnerFunded = discount;
      }

      // 3. Ghi nhận Sổ Cái / t_voucher_usage
      await this.voucherRepo.createUsage({
        voucher_id: res.voucher_id,
        order_id: orderId,
        customer_id: customerId,
        discount_amount: discount,
        platform_funded_amount: platformFunded,
        merchant_funded_amount: merchantFunded,
        partner_funded_amount: partnerFunded,
        campaign_id: v.campaign_id,
      });

      // 4. Cập nhật ví voucher của user sang USED
      await this.voucherRepo.updateUserVoucherStatus(customerId, res.voucher_id, UserVoucherStatus.USED);
    }

    // 5. Chuyển reservation sang COMMITTED và dọn dẹp Redis
    await this.voucherRepo.commitReservations(orderId);
    await this.promoRedisRepo.releaseReservation(orderId, voucherIds, customerId);

    this.logger.log(`Two-Phase Commit successfully finalized for order ${orderId} (Vouchers: ${voucherIds.join(', ')})`);

    return {
      success: true,
      order_id: orderId,
      committed_vouchers_count: reservations.length,
      total_discount_amount: totalDiscount,
    };
  }
}
