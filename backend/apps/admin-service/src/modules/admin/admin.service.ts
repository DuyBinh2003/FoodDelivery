import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';
import { ReviewApprovalDto, ApprovalStatus } from '@/modules/admin/dto/review-approval.dto.js';

@Injectable()
export class AdminService {
  private readonly userUrl = process.env.USER_SERVICE_URL!;
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL!;
  private readonly orderUrl = process.env.ORDER_SERVICE_URL!;
  
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  async getDashboardMetrics() {
    const [usersRes, restaurantsRes, ordersRes] = await Promise.all([
      fetch(`${this.userUrl}/internal/users/metrics`).catch(() => null),
      fetch(`${this.restaurantUrl}/internal/restaurants/metrics`).catch(() => null),
      fetch(`${this.orderUrl}/internal/orders/metrics`).catch(() => null),
    ]);

    const usersData = (usersRes && usersRes.ok) ? await usersRes.json().catch(() => ({})) : {};
    const restaurantsData = (restaurantsRes && restaurantsRes.ok) ? await restaurantsRes.json().catch(() => ({})) : {};
    const ordersData = (ordersRes && ordersRes.ok) ? await ordersRes.json().catch(() => ({})) : {};

    return {
      totalUsers: Number(usersData.totalUsers) || 0,
      totalRestaurants: Number(restaurantsData.totalRestaurants) || 0,
      totalDrivers: Number(usersData.totalDrivers) || 0,
      totalOrders: Number(ordersData.totalOrders) || 0,
      totalGmv: Number(ordersData.totalGmv) || 0,
    };
  }

  async getPendingApprovals() {
    const res = await fetch(`${this.userUrl}/internal/users/pending-approvals`).catch(() => null);
    if (!res || !res.ok) {
      return { restaurants: [], drivers: [] };
    }
    return res.json().catch(() => ({ restaurants: [], drivers: [] }));
  }

  async reviewApproval(id: string, dto: ReviewApprovalDto) {
    const res = await fetch(`${this.userUrl}/internal/registrations/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new BadRequestException(err.message || 'Failed to review registration');
    }
    return res.json();
  }

  async approveRestaurant(id: string, reviewMessage?: string) {
    return this.reviewApproval(id, {
      status: ApprovalStatus.APPROVED,
      review_message: reviewMessage,
    });
  }

  async rejectRestaurant(id: string, reviewMessage?: string) {
    return this.reviewApproval(id, {
      status: ApprovalStatus.REJECTED,
      review_message: reviewMessage,
    });
  }

  async approveDriver(id: string, reviewMessage?: string) {
    return this.reviewApproval(id, {
      status: ApprovalStatus.APPROVED,
      review_message: reviewMessage,
    });
  }

  async rejectDriver(id: string, reviewMessage?: string) {
    return this.reviewApproval(id, {
      status: ApprovalStatus.REJECTED,
      review_message: reviewMessage,
    });
  }

  async getConfigs() {
    return this.configRepo.find();
  }

  async updateConfig(key: string, value: string) {
    let config = await this.configRepo.findOne({ where: { config_key: key } });
    if (!config) {
      config = this.configRepo.create({ config_key: key, config_value: value });
    } else {
      config.config_value = value;
    }
    return this.configRepo.save(config);
  }
}
