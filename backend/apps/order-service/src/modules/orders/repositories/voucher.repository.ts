import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '@/modules/orders/entities/voucher.entity.js';
import { VoucherUsage } from '@/modules/orders/entities/voucher-usage.entity.js';
import { Campaign } from '@/modules/orders/entities/campaign.entity.js';
import { VoucherRule } from '@/modules/orders/entities/voucher-rule.entity.js';
import { UserVoucher } from '@/modules/orders/entities/user-voucher.entity.js';
import { VoucherReservation } from '@/modules/orders/entities/voucher-reservation.entity.js';
import { MerchantCampaignBudget } from '@/modules/orders/entities/merchant-campaign-budget.entity.js';
import { VoucherUsageStatus } from '@/modules/orders/enums/voucher-usage-status.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';
import { UserVoucherStatus } from '@/modules/orders/enums/user-voucher-status.enum.js';
import { ReservationStatus } from '@/modules/orders/enums/reservation-status.enum.js';

@Injectable()
export class VoucherRepository {
  private readonly logger = new Logger(VoucherRepository.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherUsage)
    private readonly usageRepo: Repository<VoucherUsage>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(VoucherRule)
    private readonly ruleRepo: Repository<VoucherRule>,
    @InjectRepository(UserVoucher)
    private readonly userVoucherRepo: Repository<UserVoucher>,
    @InjectRepository(VoucherReservation)
    private readonly reservationRepo: Repository<VoucherReservation>,
    @InjectRepository(MerchantCampaignBudget)
    private readonly merchantBudgetRepo: Repository<MerchantCampaignBudget>,
  ) {}

  async findByCode(code: string): Promise<Voucher | null> {
    return this.voucherRepo.findOne({
      where: {
        code: code.trim().toUpperCase(),
        is_deleted: false,
      },
      relations: { rules: true, campaign: true },
    });
  }

  async findById(id: string): Promise<Voucher | null> {
    return this.voucherRepo.findOne({
      where: {
        id,
        is_deleted: false,
      },
      relations: { rules: true, campaign: true },
    });
  }

  async createVoucher(data: Partial<Voucher>): Promise<Voucher> {
    const voucher = this.voucherRepo.create({
      ...data,
      code: data.code?.trim().toUpperCase(),
    });
    return this.voucherRepo.save(voucher);
  }

  async findActiveVouchers(restaurantId?: string): Promise<Voucher[]> {
    const query = this.voucherRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.campaign', 'campaign')
      .leftJoinAndSelect('v.rules', 'rules')
      .where('v.is_active = true')
      .andWhere('v.is_deleted = false')
      .andWhere('v.valid_from <= CURRENT_TIMESTAMP')
      .andWhere('v.valid_to >= CURRENT_TIMESTAMP')
      .andWhere('v.used_quantity < v.total_quantity')
      .andWhere('(campaign.id IS NULL OR campaign.emergency_killed = false)');

    if (restaurantId) {
      query.andWhere(
        '(v.sponsor_type != :merchant OR (v.sponsor_type = :merchant AND (v.restaurant_id = :restaurantId OR v.target_restaurant_id = :restaurantId)))',
        {
          merchant: VoucherSponsor.MERCHANT,
          restaurantId,
        },
      );
    } else {
      query.andWhere('v.sponsor_type != :merchant', { merchant: VoucherSponsor.MERCHANT });
    }

    return query.orderBy('v.created_at', 'DESC').getMany();
  }

  async countUserUsage(voucherId: string, customerId: string): Promise<number> {
    return this.usageRepo.count({
      where: {
        voucher_id: voucherId,
        customer_id: customerId,
        status: VoucherUsageStatus.APPLIED,
      },
    });
  }

  async atomicIncrementUsedQuantity(voucherId: string): Promise<boolean> {
    const result = await this.voucherRepo
      .createQueryBuilder()
      .update(Voucher)
      .set({
        used_quantity: () => 'used_quantity + 1',
      })
      .where('id = :id AND used_quantity < total_quantity AND is_active = true AND is_deleted = false', {
        id: voucherId,
      })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async atomicDecrementUsedQuantity(voucherId: string): Promise<boolean> {
    const result = await this.voucherRepo
      .createQueryBuilder()
      .update(Voucher)
      .set({
        used_quantity: () => 'GREATEST(0, used_quantity - 1)',
      })
      .where('id = :id', { id: voucherId })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async atomicIncrementClaimedQuantity(voucherId: string): Promise<boolean> {
    const result = await this.voucherRepo
      .createQueryBuilder()
      .update(Voucher)
      .set({
        claimed_quantity: () => 'claimed_quantity + 1',
      })
      .where('id = :id', { id: voucherId })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async createUsage(data: Partial<VoucherUsage>): Promise<VoucherUsage> {
    const usage = this.usageRepo.create({
      ...data,
      status: VoucherUsageStatus.APPLIED,
    });
    return this.usageRepo.save(usage);
  }

  async findUsageByOrder(orderId: string): Promise<VoucherUsage | null> {
    return this.usageRepo.findOne({
      where: { order_id: orderId },
      relations: { voucher: true, campaign: true },
    });
  }

  async revertUsage(usageId: string): Promise<void> {
    await this.usageRepo.update(usageId, {
      status: VoucherUsageStatus.REVERTED,
      reverted_at: new Date(),
    });
  }

  // --- ENTERPRISE VOUCHER WALLET & FLASH SALE ---
  async claimVoucherForUser(params: {
    userId: string;
    voucherId: string;
    deviceFingerprint: string;
    expiresAt: Date;
  }): Promise<UserVoucher> {
    const userVoucher = this.userVoucherRepo.create({
      user_id: params.userId,
      voucher_id: params.voucherId,
      device_fingerprint: params.deviceFingerprint,
      expires_at: params.expiresAt,
      status: UserVoucherStatus.AVAILABLE,
    });
    const saved = await this.userVoucherRepo.save(userVoucher);
    await this.atomicIncrementClaimedQuantity(params.voucherId);
    return saved;
  }

  async getUserVouchers(userId: string, status?: UserVoucherStatus): Promise<UserVoucher[]> {
    const query = this.userVoucherRepo.createQueryBuilder('uv')
      .leftJoinAndSelect('uv.voucher', 'v')
      .leftJoinAndSelect('v.campaign', 'campaign')
      .leftJoinAndSelect('v.rules', 'rules')
      .where('uv.user_id = :userId', { userId });

    if (status) {
      query.andWhere('uv.status = :status', { status });
    }

    return query.orderBy('uv.claimed_at', 'DESC').getMany();
  }

  async countUserClaims(voucherId: string, userId: string): Promise<number> {
    return this.userVoucherRepo.count({
      where: { voucher_id: voucherId, user_id: userId },
    });
  }

  async countDeviceClaims(deviceFingerprint: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.userVoucherRepo
      .createQueryBuilder('uv')
      .where('uv.device_fingerprint = :deviceFingerprint', { deviceFingerprint })
      .andWhere('uv.claimed_at >= :startOfDay', { startOfDay })
      .getCount();
  }

  async updateUserVoucherStatus(userId: string, voucherId: string, status: UserVoucherStatus): Promise<void> {
    await this.userVoucherRepo
      .createQueryBuilder()
      .update(UserVoucher)
      .set({
        status,
        used_at: status === UserVoucherStatus.USED ? new Date() : null,
      })
      .where('user_id = :userId AND voucher_id = :voucherId', { userId, voucherId })
      .execute();
  }

  // --- TWO-PHASE RESERVATION ---
  async createReservation(params: {
    orderId: string;
    voucherId: string;
    userId: string;
    ticketToken: string;
    discountAmount: number;
    reservedUntil: Date;
  }): Promise<VoucherReservation> {
    const reservation = this.reservationRepo.create({
      order_id: params.orderId,
      voucher_id: params.voucherId,
      user_id: params.userId,
      ticket_token: params.ticketToken,
      discount_amount: params.discountAmount,
      reserved_until: params.reservedUntil,
      status: ReservationStatus.LOCKED,
    });
    return this.reservationRepo.save(reservation);
  }

  async findReservationsByOrder(orderId: string): Promise<VoucherReservation[]> {
    return this.reservationRepo.find({
      where: { order_id: orderId },
      relations: { voucher: true },
    });
  }

  async commitReservations(orderId: string): Promise<void> {
    await this.reservationRepo.update(
      { order_id: orderId, status: ReservationStatus.LOCKED },
      { status: ReservationStatus.COMMITTED },
    );
  }

  async releaseReservations(orderId: string): Promise<void> {
    await this.reservationRepo.update(
      { order_id: orderId, status: ReservationStatus.LOCKED },
      { status: ReservationStatus.RELEASED },
    );
  }

  // --- CAMPAIGN & BUDGET MANAGEMENT ---
  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    const campaign = this.campaignRepo.create(data);
    return this.campaignRepo.save(campaign);
  }

  async findCampaignById(id: string): Promise<Campaign | null> {
    return this.campaignRepo.findOne({
      where: { id },
      relations: { vouchers: true },
    });
  }

  async getAllCampaigns(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      order: { created_at: 'DESC' },
    });
  }

  async emergencyKillCampaign(campaignId: string): Promise<boolean> {
    const result = await this.campaignRepo.update(campaignId, { emergency_killed: true });
    return (result.affected ?? 0) > 0;
  }

  async updateCampaignSpent(campaignId: string, amount: number): Promise<void> {
    await this.campaignRepo
      .createQueryBuilder()
      .update(Campaign)
      .set({
        current_spent_amount: () => `current_spent_amount + ${amount}`,
      })
      .where('id = :campaignId', { campaignId })
      .execute();
  }

  async createMerchantBudget(data: Partial<MerchantCampaignBudget>): Promise<MerchantCampaignBudget> {
    const budget = this.merchantBudgetRepo.create(data);
    return this.merchantBudgetRepo.save(budget);
  }

  async findMerchantBudget(campaignId: string, restaurantId: string): Promise<MerchantCampaignBudget | null> {
    return this.merchantBudgetRepo.findOne({
      where: { campaign_id: campaignId, restaurant_id: restaurantId },
    });
  }

  async updateMerchantBudgetSpent(campaignId: string, restaurantId: string, amount: number): Promise<void> {
    await this.merchantBudgetRepo
      .createQueryBuilder()
      .update(MerchantCampaignBudget)
      .set({
        current_spent_amount: () => `current_spent_amount + ${amount}`,
      })
      .where('campaign_id = :campaignId AND restaurant_id = :restaurantId', { campaignId, restaurantId })
      .execute();
  }
}
