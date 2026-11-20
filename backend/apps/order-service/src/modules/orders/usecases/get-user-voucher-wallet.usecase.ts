import { Injectable } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';

export interface WalletVoucherDto {
  id: string;
  voucher_id: string;
  code: string;
  name: string;
  description: string | null;
  voucher_type: string;
  voucher_category: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  status: UserVoucherStatus;
  claimed_at: Date;
  expires_at: Date;
  sponsor_type: string;
  restaurant_id: string | null;
}

@Injectable()
export class GetUserVoucherWalletUseCase {
  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(userId: string, status?: UserVoucherStatus): Promise<WalletVoucherDto[]> {
    const userVouchers = await this.voucherRepo.getUserVouchers(userId, status);

    const now = new Date();

    return userVouchers.map((uv) => {
      const v = uv.voucher;
      let effectiveStatus = uv.status;

      // Auto evaluate expired state if past expires_at
      if (effectiveStatus === UserVoucherStatus.AVAILABLE && now > uv.expires_at) {
        effectiveStatus = UserVoucherStatus.EXPIRED;
      }

      return {
        id: uv.id,
        voucher_id: v.id,
        code: v.code,
        name: v.name,
        description: v.description,
        voucher_type: v.voucher_type,
        voucher_category: v.voucher_category,
        discount_value: Number(v.discount_value),
        max_discount_amount: v.max_discount_amount ? Number(v.max_discount_amount) : null,
        min_order_amount: Number(v.min_order_amount),
        status: effectiveStatus,
        claimed_at: uv.claimed_at,
        expires_at: uv.expires_at,
        sponsor_type: v.sponsor_type,
        restaurant_id: v.restaurant_id || v.target_restaurant_id,
      };
    });
  }
}
