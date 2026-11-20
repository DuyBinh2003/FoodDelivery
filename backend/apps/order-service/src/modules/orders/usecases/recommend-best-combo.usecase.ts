import { Injectable, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { VoucherCategory } from '@/modules/orders/enums/voucher-category.enum.js';
import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';
import { Voucher } from '@/modules/orders/entities/voucher.entity.js';

export interface EvaluateComboInput {
  customerId?: string;
  restaurantId: string;
  subtotal: number;
  deliveryFee: number;
  paymentMethod?: string;
  userOrderCount?: number;
  voucherCodes?: string[]; // Optional explicit codes provided by user
}

export interface SelectedVoucherItem {
  id: string;
  code: string;
  name: string;
  category: VoucherCategory;
  discount_amount: number;
  sponsor_type: string;
}

export interface IneligibleVoucherItem {
  id: string;
  code: string;
  name: string;
  category: VoucherCategory;
  rejection_reason: string;
}

export interface RecommendBestComboOutput {
  selected_vouchers: SelectedVoucherItem[];
  total_discount_amount: number;
  food_discount_amount: number;
  shipping_discount_amount: number;
  final_subtotal: number;
  final_delivery_fee: number;
  final_total_amount: number;
  ineligible_vouchers: IneligibleVoucherItem[];
}

@Injectable()
export class RecommendBestComboUseCase {
  private readonly logger = new Logger(RecommendBestComboUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(input: EvaluateComboInput): Promise<RecommendBestComboOutput> {
    const {
      customerId,
      restaurantId,
      subtotal,
      deliveryFee,
      paymentMethod = 'COD',
      userOrderCount = 1,
      voucherCodes,
    } = input;

    // 1. Thu thập tất cả các Voucher ứng viên (Từ Ví cá nhân của khách + Voucher của sàn/quán)
    const candidateMap = new Map<string, Voucher>();

    if (customerId) {
      const userVouchers = await this.voucherRepo.getUserVouchers(customerId, UserVoucherStatus.AVAILABLE);
      for (const uv of userVouchers) {
        if (uv.voucher) {
          candidateMap.set(uv.voucher.id, uv.voucher);
        }
      }
    }

    const activeVouchers = await this.voucherRepo.findActiveVouchers(restaurantId);
    for (const v of activeVouchers) {
      candidateMap.set(v.id, v);
    }

    // Nếu người dùng nhập mã cụ thể
    if (voucherCodes && voucherCodes.length > 0) {
      for (const code of voucherCodes) {
        const v = await this.voucherRepo.findByCode(code);
        if (v) candidateMap.set(v.id, v);
      }
    }

    const candidateVouchers = Array.from(candidateMap.values());
    const eligibleByCategory: Record<VoucherCategory, Array<{ voucher: Voucher; discount: number }>> = {
      [VoucherCategory.PLATFORM_DISCOUNT]: [],
      [VoucherCategory.MERCHANT_DISCOUNT]: [],
      [VoucherCategory.FREE_SHIPPING]: [],
      [VoucherCategory.PAYMENT_DISCOUNT]: [],
    };

    const ineligibleVouchers: IneligibleVoucherItem[] = [];
    const now = new Date();
    const currentHour = now.getHours();

    // 2. Chạy Rule Engine kiểm định từng Voucher
    for (const v of candidateVouchers) {
      // Rule 1: Emergency Kill Switch
      if (v.campaign && v.campaign.emergency_killed) {
        ineligibleVouchers.push({
          id: v.id,
          code: v.code,
          name: v.name,
          category: v.voucher_category,
          rejection_reason: 'Chiến dịch tạm ngưng theo lệnh điều hành',
        });
        continue;
      }

      // Rule 2: Expiration / Validity
      if (now < v.valid_from || now > v.valid_to) {
        ineligibleVouchers.push({
          id: v.id,
          code: v.code,
          name: v.name,
          category: v.voucher_category,
          rejection_reason: 'Voucher chưa đến đợt hoặc đã hết hạn',
        });
        continue;
      }

      // Rule 3: Golden Hours (Khung giờ vàng)
      if (v.start_hour !== null && v.start_hour !== undefined && v.end_hour !== null && v.end_hour !== undefined) {
        if (currentHour < v.start_hour || currentHour > v.end_hour) {
          ineligibleVouchers.push({
            id: v.id,
            code: v.code,
            name: v.name,
            category: v.voucher_category,
            rejection_reason: `Chỉ áp dụng trong khung giờ vàng ${v.start_hour}h:00 - ${v.end_hour}h:00`,
          });
          continue;
        }
      }

      // Rule 4: Restaurant Targeting for Merchant Vouchers
      if (v.sponsor_type === VoucherSponsor.MERCHANT || v.voucher_category === VoucherCategory.MERCHANT_DISCOUNT) {
        const targetRestId = v.restaurant_id || v.target_restaurant_id;
        if (targetRestId && targetRestId !== restaurantId) {
          ineligibleVouchers.push({
            id: v.id,
            code: v.code,
            name: v.name,
            category: v.voucher_category,
            rejection_reason: 'Chỉ áp dụng cho đơn hàng tại quán phát hành',
          });
          continue;
        }
      }

      // Rule 5: Min Order Amount
      if (subtotal < Number(v.min_order_amount)) {
        const diff = Number(v.min_order_amount) - subtotal;
        ineligibleVouchers.push({
          id: v.id,
          code: v.code,
          name: v.name,
          category: v.voucher_category,
          rejection_reason: `Đơn tối thiểu ${Number(v.min_order_amount).toLocaleString('vi-VN')}đ (cần thêm ${diff.toLocaleString('vi-VN')}đ)`,
        });
        continue;
      }

      // Rule 6: Rule Engine JSON Payload conditions (m_voucher_rule)
      let ruleViolationMessage: string | null = null;
      if (v.rules && v.rules.length > 0) {
        for (const rule of v.rules) {
          if (rule.rule_type === 'USER_SEGMENT') {
            const payload = rule.rule_payload as { segment?: string };
            if (payload.segment === 'FIRST_ORDER' && userOrderCount > 0) {
              ruleViolationMessage = rule.error_message || 'Chỉ áp dụng cho khách hàng đặt đơn đầu tiên';
              break;
            }
          } else if (rule.rule_type === 'PAYMENT_METHOD') {
            const payload = rule.rule_payload as { allowed_methods?: string[] };
            if (payload.allowed_methods && !payload.allowed_methods.includes(paymentMethod.toUpperCase())) {
              ruleViolationMessage = rule.error_message || `Chỉ áp dụng khi thanh toán bằng ${payload.allowed_methods.join(', ')}`;
              break;
            }
          }
        }
      }

      if (ruleViolationMessage) {
        ineligibleVouchers.push({
          id: v.id,
          code: v.code,
          name: v.name,
          category: v.voucher_category,
          rejection_reason: ruleViolationMessage,
        });
        continue;
      }

      // Tính số tiền giảm dự kiến cho Voucher này
      let discount = 0;
      if (v.voucher_category === VoucherCategory.FREE_SHIPPING || v.voucher_type === VoucherType.FREE_SHIPPING) {
        if (v.voucher_type === VoucherType.PERCENTAGE) {
          const calc = (deliveryFee * Number(v.discount_value)) / 100;
          discount = v.max_discount_amount ? Math.min(calc, Number(v.max_discount_amount)) : calc;
        } else {
          discount = Math.min(deliveryFee, Number(v.discount_value));
        }
        discount = Math.min(discount, deliveryFee);
      } else {
        // Food discount (Platform / Merchant / Payment)
        if (v.voucher_type === VoucherType.PERCENTAGE) {
          const calc = (subtotal * Number(v.discount_value)) / 100;
          discount = v.max_discount_amount ? Math.min(calc, Number(v.max_discount_amount)) : calc;
        } else {
          discount = Math.min(subtotal, Number(v.discount_value));
        }
        discount = Math.min(discount, subtotal);
      }

      eligibleByCategory[v.voucher_category].push({ voucher: v, discount });
    }

    // 3. Chọn đúng 1 voucher tốt nhất cho từng tầng (Multi-layer Stacking)
    const selectedVouchers: SelectedVoucherItem[] = [];
    let remainingSubtotal = subtotal;
    let remainingDeliveryFee = deliveryFee;
    let foodDiscountAmount = 0;
    let shippingDiscountAmount = 0;

    // Tầng 1: Free Shipping
    const freeshipCandidates = eligibleByCategory[VoucherCategory.FREE_SHIPPING].sort((a, b) => b.discount - a.discount);
    if (freeshipCandidates.length > 0) {
      const best = freeshipCandidates[0];
      const actualDiscount = Math.min(best.discount, remainingDeliveryFee);
      remainingDeliveryFee = Math.max(0, remainingDeliveryFee - actualDiscount);
      shippingDiscountAmount += actualDiscount;
      selectedVouchers.push({
        id: best.voucher.id,
        code: best.voucher.code,
        name: best.voucher.name,
        category: VoucherCategory.FREE_SHIPPING,
        discount_amount: actualDiscount,
        sponsor_type: best.voucher.sponsor_type,
      });
    }

    // Tầng 2: Merchant Discount (Ưu đãi quán)
    const merchantCandidates = eligibleByCategory[VoucherCategory.MERCHANT_DISCOUNT].sort((a, b) => b.discount - a.discount);
    if (merchantCandidates.length > 0 && remainingSubtotal > 0) {
      const best = merchantCandidates[0];
      const actualDiscount = Math.min(best.discount, remainingSubtotal);
      remainingSubtotal = Math.max(0, remainingSubtotal - actualDiscount);
      foodDiscountAmount += actualDiscount;
      selectedVouchers.push({
        id: best.voucher.id,
        code: best.voucher.code,
        name: best.voucher.name,
        category: VoucherCategory.MERCHANT_DISCOUNT,
        discount_amount: actualDiscount,
        sponsor_type: best.voucher.sponsor_type,
      });
    }

    // Tầng 3: Platform Discount (Ưu đãi sàn)
    const platformCandidates = eligibleByCategory[VoucherCategory.PLATFORM_DISCOUNT].sort((a, b) => b.discount - a.discount);
    if (platformCandidates.length > 0 && remainingSubtotal > 0) {
      const best = platformCandidates[0];
      const actualDiscount = Math.min(best.discount, remainingSubtotal);
      remainingSubtotal = Math.max(0, remainingSubtotal - actualDiscount);
      foodDiscountAmount += actualDiscount;
      selectedVouchers.push({
        id: best.voucher.id,
        code: best.voucher.code,
        name: best.voucher.name,
        category: VoucherCategory.PLATFORM_DISCOUNT,
        discount_amount: actualDiscount,
        sponsor_type: best.voucher.sponsor_type,
      });
    }

    // Tầng 4: Payment Discount (Ưu đãi cổng thanh toán)
    const paymentCandidates = eligibleByCategory[VoucherCategory.PAYMENT_DISCOUNT].sort((a, b) => b.discount - a.discount);
    if (paymentCandidates.length > 0 && remainingSubtotal > 0) {
      const best = paymentCandidates[0];
      const actualDiscount = Math.min(best.discount, remainingSubtotal);
      remainingSubtotal = Math.max(0, remainingSubtotal - actualDiscount);
      foodDiscountAmount += actualDiscount;
      selectedVouchers.push({
        id: best.voucher.id,
        code: best.voucher.code,
        name: best.voucher.name,
        category: VoucherCategory.PAYMENT_DISCOUNT,
        discount_amount: actualDiscount,
        sponsor_type: best.voucher.sponsor_type,
      });
    }

    const totalDiscountAmount = foodDiscountAmount + shippingDiscountAmount;
    const finalSubtotal = remainingSubtotal;
    const finalDeliveryFee = remainingDeliveryFee;
    const finalTotalAmount = finalSubtotal + finalDeliveryFee;

    return {
      selected_vouchers: selectedVouchers,
      total_discount_amount: totalDiscountAmount,
      food_discount_amount: foodDiscountAmount,
      shipping_discount_amount: shippingDiscountAmount,
      final_subtotal: finalSubtotal,
      final_delivery_fee: finalDeliveryFee,
      final_total_amount: finalTotalAmount,
      ineligible_vouchers: ineligibleVouchers,
    };
  }
}
