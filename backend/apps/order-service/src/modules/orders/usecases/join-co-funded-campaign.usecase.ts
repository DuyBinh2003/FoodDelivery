import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';
import { CampaignSponsor } from '@/modules/orders/enums/campaign-sponsor.enum.js';
import { MerchantCampaignBudget } from '@/modules/orders/entities/merchant-campaign-budget.entity.js';

export interface JoinCoFundedInput {
  campaignId: string;
  restaurantId: string;
  merchantBudgetCap: number;
}

@Injectable()
export class JoinCoFundedCampaignUseCase {
  private readonly logger = new Logger(JoinCoFundedCampaignUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(input: JoinCoFundedInput): Promise<MerchantCampaignBudget> {
    const { campaignId, restaurantId, merchantBudgetCap } = input;

    if (merchantBudgetCap <= 0) {
      throw new BadRequestException('Hạn mức ngân sách tối đa của nhà hàng phải lớn hơn 0');
    }

    const campaign = await this.voucherRepo.findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch ${campaignId} không tồn tại`);
    }

    if (campaign.sponsor_type !== CampaignSponsor.CO_FUNDED) {
      throw new BadRequestException('Chỉ chiến dịch Đồng tài trợ (CO_FUNDED) mới cho phép nhà hàng đăng ký tham gia');
    }

    if (campaign.emergency_killed) {
      throw new BadRequestException('Chiến dịch này đã bị khóa khẩn cấp');
    }

    const existing = await this.voucherRepo.findMerchantBudget(campaignId, restaurantId);
    if (existing) {
      throw new ConflictException('Nhà hàng đã đăng ký tham gia chiến dịch này trước đó');
    }

    const budget = await this.voucherRepo.createMerchantBudget({
      campaign_id: campaignId,
      restaurant_id: restaurantId,
      merchant_budget_cap: merchantBudgetCap,
      current_spent_amount: 0,
      is_active: true,
    });

    this.logger.log(`Restaurant ${restaurantId} joined co-funded campaign ${campaign.code} (Budget cap: ${merchantBudgetCap.toLocaleString('vi-VN')} VND)`);
    return budget;
  }
}
