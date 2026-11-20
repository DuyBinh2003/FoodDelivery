import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';
import type { VoucherValidationResult } from '@/modules/orders/dto/voucher-response.dto.js';
import type { Voucher } from '@/modules/orders/entities/voucher.entity.js';

export interface ValidateVoucherParams {
  code: string;
  restaurant_id: string;
  subtotal: number;
  delivery_fee?: number;
  customer_id?: string;
  currentTime?: Date;
}

@Injectable()
export class ValidateVoucherUseCase {
  private readonly logger = new Logger(ValidateVoucherUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(params: ValidateVoucherParams): Promise<VoucherValidationResult & { voucher: Voucher }> {
    const { code, restaurant_id, customer_id } = params;
    const subtotal = Number(params.subtotal);
    const delivery_fee = Number(params.delivery_fee ?? 15000);
    const now = params.currentTime ? new Date(params.currentTime) : new Date();

    const voucher = await this.voucherRepo.findByCode(code);
    if (!voucher || voucher.is_deleted) {
      throw new NotFoundException(`Mã ưu đãi '${code}' không tồn tại hoặc đã bị xóa.`);
    }

    if (!voucher.is_active) {
      throw new BadRequestException(`Mã ưu đãi '${code}' hiện đang tạm dừng hoạt động.`);
    }

    if (now < new Date(voucher.valid_from) || now > new Date(voucher.valid_to)) {
      throw new BadRequestException(`Mã ưu đãi '${code}' chưa có hiệu lực hoặc đã hết hạn.`);
    }

    if (voucher.start_hour !== null && voucher.end_hour !== null) {
      const currentHour = now.getHours();
      if (currentHour < voucher.start_hour || currentHour >= voucher.end_hour) {
        throw new BadRequestException(
          `Mã ưu đãi '${code}' chỉ áp dụng trong khung giờ vàng từ ${voucher.start_hour}:00 đến ${voucher.end_hour}:00.`,
        );
      }
    }

    if (subtotal < Number(voucher.min_order_amount)) {
      throw new BadRequestException(
        `Đơn hàng cần đạt tối thiểu ${Number(voucher.min_order_amount).toLocaleString('vi-VN')} VND để sử dụng mã này.`,
      );
    }

    if (voucher.sponsor_type === VoucherSponsor.MERCHANT && voucher.restaurant_id !== restaurant_id) {
      throw new BadRequestException('Mã ưu đãi của đối tác này không thể áp dụng cho nhà hàng được chọn.');
    }

    if (voucher.used_quantity >= voucher.total_quantity) {
      throw new BadRequestException(`Mã ưu đãi '${code}' đã hết số lượt sử dụng toàn hệ thống.`);
    }

    if (customer_id) {
      const userUsageCount = await this.voucherRepo.countUserUsage(voucher.id, customer_id);
      if (userUsageCount >= voucher.max_usage_per_user) {
        throw new BadRequestException(
          `Bạn đã đạt giới hạn sử dụng mã '${code}' (${voucher.max_usage_per_user} lần).`,
        );
      }
    }

    let discountAmount = 0;
    let finalSubtotal = subtotal;
    let finalDeliveryFee = delivery_fee;

    switch (voucher.voucher_type) {
      case VoucherType.PERCENTAGE: {
        let calculated = (subtotal * Number(voucher.discount_value)) / 100;
        if (voucher.max_discount_amount && calculated > Number(voucher.max_discount_amount)) {
          calculated = Number(voucher.max_discount_amount);
        }
        discountAmount = Math.min(calculated, subtotal);
        finalSubtotal = Math.max(0, subtotal - discountAmount);
        break;
      }

      case VoucherType.FIXED_AMOUNT: {
        discountAmount = Math.min(Number(voucher.discount_value), subtotal);
        finalSubtotal = Math.max(0, subtotal - discountAmount);
        break;
      }

      case VoucherType.FREE_SHIPPING: {
        const value = Number(voucher.discount_value);
        const freeShipLimit = value > 0 ? value : delivery_fee;
        discountAmount = Math.min(freeShipLimit, delivery_fee);
        finalDeliveryFee = Math.max(0, delivery_fee - discountAmount);
        break;
      }
    }

    const finalTotalAmount = finalSubtotal + finalDeliveryFee;

    return {
      is_valid: true,
      voucher_id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      voucher_type: voucher.voucher_type,
      sponsor_type: voucher.sponsor_type,
      discount_amount: Math.round(discountAmount),
      final_subtotal: Math.round(finalSubtotal),
      final_delivery_fee: Math.round(finalDeliveryFee),
      final_total_amount: Math.round(finalTotalAmount),
      voucher,
    };
  }
}
