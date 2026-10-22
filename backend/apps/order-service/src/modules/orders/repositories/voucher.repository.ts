import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voucher } from '@/modules/orders/entities/voucher.entity.js';
import { VoucherUsage } from '@/modules/orders/entities/voucher-usage.entity.js';
import { VoucherUsageStatus } from '@/modules/orders/enums/voucher-usage-status.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';

@Injectable()
export class VoucherRepository {
  private readonly logger = new Logger(VoucherRepository.name);

  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepo: Repository<Voucher>,
    @InjectRepository(VoucherUsage)
    private readonly usageRepo: Repository<VoucherUsage>,
  ) {}

  async findByCode(code: string): Promise<Voucher | null> {
    return this.voucherRepo.findOne({
      where: {
        code: code.trim().toUpperCase(),
        is_deleted: false,
      },
    });
  }

  async findById(id: string): Promise<Voucher | null> {
    return this.voucherRepo.findOne({
      where: {
        id,
        is_deleted: false,
      },
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
      .where('v.is_active = true')
      .andWhere('v.is_deleted = false')
      .andWhere('v.valid_from <= CURRENT_TIMESTAMP')
      .andWhere('v.valid_to >= CURRENT_TIMESTAMP')
      .andWhere('v.used_quantity < v.total_quantity');

    if (restaurantId) {
      query.andWhere(
        '(v.sponsor_type = :platform OR (v.sponsor_type = :merchant AND v.restaurant_id = :restaurantId))',
        {
          platform: VoucherSponsor.PLATFORM,
          merchant: VoucherSponsor.MERCHANT,
          restaurantId,
        },
      );
    } else {
      query.andWhere('v.sponsor_type = :platform', { platform: VoucherSponsor.PLATFORM });
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
      relations: { voucher: true },
    });
  }

  async revertUsage(usageId: string): Promise<void> {
    await this.usageRepo.update(usageId, {
      status: VoucherUsageStatus.REVERTED,
      reverted_at: new Date(),
    });
  }
}
