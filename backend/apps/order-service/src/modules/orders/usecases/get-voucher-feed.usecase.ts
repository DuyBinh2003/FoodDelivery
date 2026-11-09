import { Injectable } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { DistributionType } from '@/modules/orders/enums/distribution-type.enum.js';

export interface VoucherFeedItemDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  voucher_type: string;
  voucher_category: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  total_quantity: number;
  claimed_quantity: number;
  claimed_percentage: number;
  is_almost_full: boolean;
  valid_from: Date;
  valid_to: Date;
  sponsor_type: string;
  restaurant_id: string | null;
  has_claimed?: boolean;
}

@Injectable()
export class GetVoucherFeedUseCase {
  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(userId?: string): Promise<VoucherFeedItemDto[]> {
    const vouchers = await this.voucherRepo.findActiveVouchers();

    // Lọc các voucher có thể claim (COLLECTIBLE)
    const collectibleVouchers = vouchers.filter((v) => v.distribution_type === DistributionType.COLLECTIBLE);

    let userClaimedVoucherIds = new Set<string>();
    if (userId) {
      const userVouchers = await this.voucherRepo.getUserVouchers(userId);
      userClaimedVoucherIds = new Set(userVouchers.map((uv) => uv.voucher_id));
    }

    return collectibleVouchers.map((v) => {
      const total = v.total_quantity || 1;
      const claimed = v.claimed_quantity || 0;
      const percentage = Math.min(100, Math.round((claimed / total) * 100));

      return {
        id: v.id,
        code: v.code,
        name: v.name,
        description: v.description,
        voucher_type: v.voucher_type,
        voucher_category: v.voucher_category,
        discount_value: Number(v.discount_value),
        max_discount_amount: v.max_discount_amount ? Number(v.max_discount_amount) : null,
        min_order_amount: Number(v.min_order_amount),
        total_quantity: v.total_quantity,
        claimed_quantity: v.claimed_quantity,
        claimed_percentage: percentage,
        is_almost_full: percentage >= 80,
        valid_from: v.valid_from,
        valid_to: v.valid_to,
        sponsor_type: v.sponsor_type,
        restaurant_id: v.restaurant_id || v.target_restaurant_id,
        has_claimed: userClaimedVoucherIds.has(v.id),
      };
    });
  }
}
