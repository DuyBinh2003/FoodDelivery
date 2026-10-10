import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  async getDashboardMetrics() {
    const [usersRes, restaurantsRes, ordersRes] = await Promise.all([
      fetch('http://localhost:3001/internal/users/metrics').catch(() => ({ json: () => ({ totalUsers: 0, totalDrivers: 0 }) })),
      fetch('http://localhost:3002/internal/restaurants/metrics').catch(() => ({ json: () => ({ totalRestaurants: 0 }) })),
      fetch('http://localhost:3003/internal/orders/metrics').catch(() => ({ json: () => ({ totalOrders: 0, totalGmv: 0 }) })),
    ]);

    const usersData = await usersRes.json();
    const restaurantsData = await restaurantsRes.json();
    const ordersData = await ordersRes.json();

    return {
      totalUsers: usersData.totalUsers || 0,
      totalRestaurants: restaurantsData.totalRestaurants || 0,
      totalDrivers: usersData.totalDrivers || 0,
      totalOrders: ordersData.totalOrders || 0,
      totalGmv: ordersData.totalGmv || 0,
    };
  }

  async getPendingApprovals() {
    const res = await fetch('http://localhost:3001/internal/users/pending-approvals').catch(() => ({ json: () => ({ restaurants: [], drivers: [] }) }));
    return res.json();
  }

  async approveRestaurant(id: string) {
    const res = await fetch('http://localhost:3002/internal/restaurants/' + id + '/approve', { method: 'POST' });
    if (!res.ok) throw new NotFoundException('Failed to approve restaurant');
    return res.json();
  }

  async rejectRestaurant(id: string) {
    const res = await fetch('http://localhost:3002/internal/restaurants/' + id + '/reject', { method: 'POST' });
    if (!res.ok) throw new NotFoundException('Failed to reject restaurant');
    return res.json();
  }

  async approveDriver(id: string) {
    const res = await fetch('http://localhost:3001/internal/drivers/' + id + '/approve', { method: 'POST' });
    if (!res.ok) throw new NotFoundException('Failed to approve driver');
    return res.json();
  }

  async rejectDriver(id: string) {
    const res = await fetch('http://localhost:3001/internal/drivers/' + id + '/reject', { method: 'POST' });
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
