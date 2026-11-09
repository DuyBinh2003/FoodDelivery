import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';

@Injectable()
export class EmergencyKillCampaignUseCase {
  private readonly logger = new Logger(EmergencyKillCampaignUseCase.name);

  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(campaignId: string): Promise<{ success: boolean; message: string; campaign_id: string }> {
    const campaign = await this.voucherRepo.findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch ${campaignId} không tồn tại`);
    }

    await this.voucherRepo.emergencyKillCampaign(campaignId);

    this.logger.warn(`EMERGENCY KILL SWITCH ACTIVATED for campaign ${campaign.code} (ID: ${campaignId})`);

    return {
      success: true,
      message: `Đã kích hoạt ngắt khẩn cấp chiến dịch ${campaign.name}. Mọi hoạt động claim/apply voucher đã bị khóa tức thì.`,
      campaign_id: campaignId,
    };
  }
}
