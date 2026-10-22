import { Injectable, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import type { AvailableVoucherItem } from '@/modules/orders/dto/voucher-response.dto.js';

export interface GetAvailableVouchersParams {
  restaurant_id?: string;
  subtotal?: number;
  customer_id?: string;
  currentTime?: Date;
}

@Injectable()
export class GetAvailableVouchersUseCase {
  private readonly logger = new Logger(GetAvailableVouchersUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(params: GetAvailableVouchersParams): Promise<AvailableVoucherItem[]> {
    const { restaurant_id, customer_id } = params;
    const subtotal = Number(params.subtotal ?? 0);
    const now = params.currentTime ? new Date(params.currentTime) : new Date();

    const vouchers = await this.voucherRepo.findActiveVouchers(restaurant_id);

    const results: AvailableVoucherItem[] = [];

    for (const v of vouchers) {
      let isApplicable = true;
      let reason: string | undefined;

      if (v.start_hour !== null && v.end_hour !== null) {
        const currentHour = now.getHours();
        if (currentHour < v.start_hour || currentHour >= v.end_hour) {
          isApplicable = false;
          reason = `Chỉ áp dụng từ ${v.start_hour}:00 đến ${v.end_hour}:00`;
        }
      }

      if (isApplicable && subtotal < Number(v.min_order_amount)) {
        isApplicable = false;
        reason = `Đơn tối thiểu ${Number(v.min_order_amount).toLocaleString('vi-VN')} VND`;
      }

      if (isApplicable && customer_id) {
        const usageCount = await this.voucherRepo.countUserUsage(v.id, customer_id);
        if (usageCount >= v.max_usage_per_user) {
          isApplicable = false;
          reason = `Đã dùng hết ${v.max_usage_per_user} lượt`;
        }
      }

      let estimatedDiscount = 0;
      if (isApplicable && subtotal > 0) {
        if (v.voucher_type === VoucherType.PERCENTAGE) {
          let calc = (subtotal * Number(v.discount_value)) / 100;
          if (v.max_discount_amount && calc > Number(v.max_discount_amount)) {
            calc = Number(v.max_discount_amount);
          }
          estimatedDiscount = Math.min(calc, subtotal);
        } else if (v.voucher_type === VoucherType.FIXED_AMOUNT) {
          estimatedDiscount = Math.min(Number(v.discount_value), subtotal);
        } else if (v.voucher_type === VoucherType.FREE_SHIPPING) {
          estimatedDiscount = Number(v.discount_value > 0 ? v.discount_value : 15000);
        }
      }

      results.push({
        id: v.id,
        code: v.code,
        name: v.name,
        description: v.description,
        voucher_type: v.voucher_type,
        sponsor_type: v.sponsor_type,
        discount_value: Number(v.discount_value),
        max_discount_amount: v.max_discount_amount ? Number(v.max_discount_amount) : null,
        min_order_amount: Number(v.min_order_amount),
        is_applicable: isApplicable,
        estimated_discount: Math.round(estimatedDiscount),
        reason_not_applicable: reason,
        valid_to: v.valid_to,
      });
    }

    return results;
  }
}
