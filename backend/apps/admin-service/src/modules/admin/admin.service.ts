import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';

@Injectable()
export class AdminService {
  private readonly userUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL || 'http://localhost:3003';
  private readonly orderUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
  
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

  async approveRestaurant(id: string) {
    const res = await fetch(`${this.restaurantUrl}/internal/restaurants/${id}/approve`, { method: 'POST' });
    if (!res.ok) throw new NotFoundException('Failed to approve restaurant');
    return res.json();
  }

  async rejectRestaurant(id: string) {
    const res = await fetch(`${this.restaurantUrl}/internal/restaurants/${id}/reject`, { method: 'POST' });
    if (!res.ok) throw new NotFoundException('Failed to reject restaurant');
    return res.json();
  }

  async approveDriver(id: string) {
    const res = await fetch(`${this.userUrl}/internal/drivers/${id}/approve`, { method: 'POST' });
    if (!res.ok) throw new NotFoundException('Failed to approve driver');
    return res.json();
  }

  async rejectDriver(id: string) {
    const res = await fetch(`${this.userUrl}/internal/drivers/${id}/reject`, { method: 'POST' });
    if (!res.ok) throw new NotFoundException('Failed to reject driver');
    return res.json();
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
