import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { PromotionRedisRepository } from '@/modules/orders/repositories/promotion.redis.repository.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';
import { VoucherCategory } from '@/modules/orders/enums/voucher-category.enum.js';

export interface ReserveVouchersInput {
  orderId: string;
  userId: string;
  voucherIds: string[];
  subtotal: number;
  deliveryFee: number;
}

export interface ReserveVouchersOutput {
  success: boolean;
  ticket_token: string;
  order_id: string;
  reserved_vouchers: Array<{
    id: string;
    code: string;
    category: VoucherCategory;
    discount_amount: number;
  }>;
  total_discount_amount: number;
  reserved_until: Date;
}

@Injectable()
export class ReserveVouchersUseCase {
  private readonly logger = new Logger(ReserveVouchersUseCase.name);

  constructor(
    private readonly voucherRepo: VoucherRepository,
    private readonly promoRedisRepo: PromotionRedisRepository,
  ) {}

  async execute(input: ReserveVouchersInput): Promise<ReserveVouchersOutput> {
    const { orderId, userId, voucherIds } = input;

    if (!voucherIds || voucherIds.length === 0) {
      throw new BadRequestException('Danh sách voucher đặt chỗ không được để trống');
    }

    // 1. Kiểm tra Mutual Exclusion: Không được có 2 voucher cùng nhóm (category)
    const categorySet = new Set<string>();
    const vouchersToLock = [];

    for (const vId of voucherIds) {
      const v = await this.voucherRepo.findById(vId);
      if (!v || !v.is_active || v.is_deleted) {
        throw new BadRequestException(`Voucher ${vId} không tồn tại hoặc đã ngừng áp dụng`);
      }
      if (categorySet.has(v.voucher_category)) {
        throw new ConflictException(
          `Xung đột ưu đãi: Không thể áp dụng đồng thời 2 voucher thuộc nhóm ${v.voucher_category}`,
        );
      }
      categorySet.add(v.voucher_category);
      vouchersToLock.push(v);
    }

    // 2. Khóa giữ chỗ trên Redis với TTL 15 phút (900 giây)
    const redisResult = await this.promoRedisRepo.reserveVouchers(orderId, voucherIds, userId, 900);
    if (!redisResult.success) {
      throw new ConflictException('Một trong các voucher đang bị giữ chỗ bởi giao dịch khác');
    }

    const ticketToken = redisResult.ticketToken || `tkt_${orderId}_${Date.now()}`;
    const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);

    // 3. Ghi nhận bản ghi t_voucher_reservation và cập nhật t_user_voucher sang RESERVED
    const reservedDetails = [];
    let totalDiscount = 0;

    for (const v of vouchersToLock) {
      // Tính discount cơ bản để ghi nhận reservation
      let discount = 0;
      if (v.voucher_category === VoucherCategory.FREE_SHIPPING) {
        discount = Math.min(input.deliveryFee, Number(v.discount_value));
      } else {
        discount = Math.min(input.subtotal, Number(v.discount_value));
      }
      totalDiscount += discount;

      await this.voucherRepo.createReservation({
        orderId,
        voucherId: v.id,
        userId,
        ticketToken,
        discountAmount: discount,
        reservedUntil,
      });

      await this.voucherRepo.updateUserVoucherStatus(userId, v.id, UserVoucherStatus.RESERVED);

      reservedDetails.push({
        id: v.id,
        code: v.code,
        category: v.voucher_category,
        discount_amount: discount,
      });
    }

    this.logger.log(`Two-Phase Reservation locked for order ${orderId} (${vouchersToLock.length} vouchers, ticket: ${ticketToken})`);

    return {
      success: true,
      ticket_token: ticketToken,
      order_id: orderId,
      reserved_vouchers: reservedDetails,
      total_discount_amount: totalDiscount,
      reserved_until: reservedUntil,
    };
  }
}
