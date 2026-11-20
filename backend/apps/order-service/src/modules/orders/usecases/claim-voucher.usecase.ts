import { Injectable, BadRequestException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { PromotionRedisRepository } from '@/modules/orders/repositories/promotion.redis.repository.js';

export interface ClaimVoucherInput {
  voucherId: string;
  userId: string;
  deviceFingerprint: string;
}

export interface ClaimVoucherOutput {
  success: boolean;
  message: string;
  voucher_id: string;
  code: string;
  expires_at: Date;
  remaining_quota?: number;
}

@Injectable()
export class ClaimVoucherUseCase {
  private readonly logger = new Logger(ClaimVoucherUseCase.name);

  constructor(
    private readonly voucherRepo: VoucherRepository,
    private readonly promoRedisRepo: PromotionRedisRepository,
  ) {}

  async execute(input: ClaimVoucherInput): Promise<ClaimVoucherOutput> {
    const { voucherId, userId, deviceFingerprint } = input;

    // 1. Kiểm tra Rate Limit trên User & IP/Device
    const allowed = await this.promoRedisRepo.checkRateLimit(`claim:${userId}`, 30, 60);
    if (!allowed) {
      throw new BadRequestException('Quá nhiều yêu cầu nhận voucher, vui lòng thử lại sau giây lát');
    }

    // 2. Kiểm tra tồn tại Voucher
    const voucher = await this.voucherRepo.findById(voucherId);
    if (!voucher || voucher.is_deleted || !voucher.is_active) {
      throw new BadRequestException('Voucher không tồn tại hoặc đã ngừng áp dụng');
    }

    // 3. Kiểm tra chiến dịch liên kết có bị ngắt khẩn cấp (Emergency Kill Switch) không
    if (voucher.campaign && voucher.campaign.emergency_killed) {
      throw new ForbiddenException('Chiến dịch ưu đãi này đã tạm ngưng theo lệnh điều hành hệ thống');
    }

    // 4. Kiểm tra thời hạn hiệu lực của Voucher
    const now = new Date();
    if (now < voucher.valid_from) {
      throw new BadRequestException('Khung giờ săn voucher chưa bắt đầu');
    }
    if (now > voucher.valid_to) {
      throw new BadRequestException('Voucher đã hết hạn áp dụng');
    }

    // 5. Kiểm tra gian lận thiết bị (Device Fingerprint Abuse Check)
    const deviceDailyClaims = await this.voucherRepo.countDeviceClaims(deviceFingerprint);
    if (deviceDailyClaims >= 5) {
      this.logger.warn(`Device ${deviceFingerprint} hit claim velocity limit`);
      throw new ForbiddenException('Thiết bị này đã đạt giới hạn nhận mã trong ngày');
    }

    // 6. Kiểm tra giới hạn số lần claim của user đối với voucher này
    const userClaimsCount = await this.voucherRepo.countUserClaims(voucherId, userId);
    if (userClaimsCount >= voucher.max_claims_per_user) {
      throw new ConflictException('Bạn đã đạt giới hạn số lần lưu voucher này');
    }

    // 7. Thực hiện trừ Quota nguyên tử qua Redis Lua Script (High Concurrency Protection)
    const claimResult = await this.promoRedisRepo.atomicClaimVoucher({
      voucherId: voucher.id,
      userId,
      deviceFingerprint,
      totalQuantity: voucher.total_quantity,
      usedQuantity: voucher.claimed_quantity,
      maxClaimsPerUser: voucher.max_claims_per_user,
    });

    if (!claimResult.success) {
      if (claimResult.errorCode === 'OUT_OF_STOCK') {
        throw new BadRequestException('Rất tiếc, voucher Flash Sale đã được lưu hết!');
      }
      if (claimResult.errorCode === 'ALREADY_CLAIMED') {
        throw new ConflictException('Bạn đã lưu voucher này rồi');
      }
      if (claimResult.errorCode === 'DEVICE_LIMIT_EXCEEDED') {
        throw new ForbiddenException('Thiết bị này đã đạt giới hạn lưu mã');
      }
      throw new BadRequestException(claimResult.message || 'Không thể lưu voucher');
    }

    // 8. Lưu bản ghi vào Ví Voucher Cá Nhân (t_user_voucher)
    const userVoucher = await this.voucherRepo.claimVoucherForUser({
      userId,
      voucherId: voucher.id,
      deviceFingerprint,
      expiresAt: voucher.valid_to,
    });

    this.logger.log(`User ${userId} claimed voucher ${voucher.code} (Wallet entry: ${userVoucher.id})`);

    return {
      success: true,
      message: 'Lưu voucher vào ví thành công!',
      voucher_id: voucher.id,
      code: voucher.code,
      expires_at: voucher.valid_to,
      remaining_quota: claimResult.remainingQuota,
    };
  }
}
