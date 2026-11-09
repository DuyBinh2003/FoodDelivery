import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { CampaignSponsor } from '@/modules/orders/enums/campaign-sponsor.enum.js';
import { Campaign } from '@/modules/orders/entities/campaign.entity.js';

export interface CreateCampaignInput {
  code: string;
  name: string;
  sponsorType: CampaignSponsor;
  platformShareRatio?: number;
  merchantShareRatio?: number;
  partnerShareRatio?: number;
  totalBudgetAmount: number;
  startTime: Date;
  endTime: Date;
}

@Injectable()
export class CreateCampaignUseCase {
  private readonly logger = new Logger(CreateCampaignUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(input: CreateCampaignInput): Promise<Campaign> {
    const {
      code,
      name,
      sponsorType,
      platformShareRatio = 100,
      merchantShareRatio = 0,
      partnerShareRatio = 0,
      totalBudgetAmount,
      startTime,
      endTime,
    } = input;

    if (totalBudgetAmount <= 0) {
      throw new BadRequestException('Hạn mức ngân sách chiến dịch phải lớn hơn 0');
    }

    if (new Date(startTime) >= new Date(endTime)) {
      throw new BadRequestException('Thời điểm bắt đầu phải trước thời điểm kết thúc');
    }

    const totalRatio = platformShareRatio + merchantShareRatio + partnerShareRatio;
    if (Math.abs(totalRatio - 100) > 0.01) {
      throw new BadRequestException('Tổng tỷ lệ chia sẻ tài trợ (Platform + Merchant + Partner) phải đúng 100%');
    }

    const campaign = await this.voucherRepo.createCampaign({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      sponsor_type: sponsorType,
      platform_share_ratio: platformShareRatio,
      merchant_share_ratio: merchantShareRatio,
      partner_share_ratio: partnerShareRatio,
      total_budget_amount: totalBudgetAmount,
      current_spent_amount: 0,
      emergency_killed: false,
      start_time: new Date(startTime),
      end_time: new Date(endTime),
    });

    this.logger.log(`Created new campaign ${campaign.code} (Budget: ${totalBudgetAmount.toLocaleString('vi-VN')} VND)`);
    return campaign;
  }
}
