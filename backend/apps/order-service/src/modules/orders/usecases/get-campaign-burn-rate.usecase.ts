import { Injectable, NotFoundException } from '@nestjs/common';
import { VoucherRepository } from '@/modules/orders/repositories/voucher.repository.js';

export interface CampaignBurnRateDto {
  campaign_id: string;
  campaign_code: string;
  campaign_name: string;
  total_budget_amount: number;
  current_spent_amount: number;
  remaining_budget_amount: number;
  burn_rate_percentage: number;
  burn_rate_per_minute: number;
  estimated_minutes_remaining: number | null;
  is_emergency_killed: boolean;
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED';
}

@Injectable()
export class GetCampaignBurnRateUseCase {
  constructor(private readonly voucherRepo: VoucherRepository) {}

  async execute(campaignId: string): Promise<CampaignBurnRateDto> {
    const campaign = await this.voucherRepo.findCampaignById(campaignId);
    if (!campaign) {
      throw new NotFoundException(`Chiến dịch ${campaignId} không tồn tại`);
    }

    const totalBudget = Number(campaign.total_budget_amount);
    const spent = Number(campaign.current_spent_amount);
    const remaining = Math.max(0, totalBudget - spent);
    const burnPercentage = totalBudget > 0 ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0;

    // Tính tốc độ trung bình (ước tính mẫu)
    const startTime = new Date(campaign.start_time).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.max(1, Math.round((now - startTime) / (60 * 1000)));
    const burnRatePerMinute = Math.round(spent / elapsedMinutes);

    const minutesRemaining = burnRatePerMinute > 0 ? Math.round(remaining / burnRatePerMinute) : null;

    let status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED' = 'SAFE';
    if (burnPercentage >= 100) {
      status = 'EXHAUSTED';
    } else if (burnPercentage >= 90) {
      status = 'CRITICAL';
    } else if (burnPercentage >= 70) {
      status = 'WARNING';
    }

    return {
      campaign_id: campaign.id,
      campaign_code: campaign.code,
      campaign_name: campaign.name,
      total_budget_amount: totalBudget,
      current_spent_amount: spent,
      remaining_budget_amount: remaining,
      burn_rate_percentage: burnPercentage,
      burn_rate_per_minute: burnRatePerMinute,
      estimated_minutes_remaining: minutesRemaining,
      is_emergency_killed: campaign.emergency_killed,
      status,
    };
  }
}
