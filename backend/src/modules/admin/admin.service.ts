import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';
import { Restaurant } from '@/modules/restaurants/entities/restaurant.entity.js';
import { DriverProfile } from '@/modules/users/entities/driver-profile.entity.js';
import { User } from '@/modules/users/entities/user.entity.js';
import { Order } from '@/modules/orders/entities/order.entity.js';
import { RegistrationRequest } from '@/modules/users/entities/registration-request.entity.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
    @InjectRepository(DriverProfile)
    private readonly driverRepo: Repository<DriverProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(RegistrationRequest)
    private readonly registrationReqRepo: Repository<RegistrationRequest>,
  ) {}

  async getDashboardMetrics() {
    const totalUsers = await this.userRepo.count();
    const totalRestaurants = await this.restaurantRepo.count();
    const totalDrivers = await this.driverRepo.count();
    const totalOrders = await this.orderRepo.count();
    
    // Calculate GMV (Gross Merchandise Value)
    const { gmv } = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.total_amount)', 'gmv')
      .where('order.status = :status', { status: 'COMPLETED' })
      .getRawOne();

    return {
      totalUsers,
      totalRestaurants,
      totalDrivers,
      totalOrders,
      totalGmv: parseFloat(gmv || '0'),
    };
  }

  async getPendingApprovals() {
    const pendingRequests = await this.registrationReqRepo.find({
      where: { status: 'PENDING' },
      relations: { user: true },
    });

    const restaurants = pendingRequests
      .filter((r) => r.type === 'RESTAURANT')
      .map((r) => ({
        id: r.id,
        name: (r.payload as any)?.name || r.user?.email || 'Unknown Restaurant',
        created_at: r.createdAt,
      }));

    const drivers = pendingRequests
      .filter((r) => r.type === 'DRIVER')
      .map((r) => ({
        id: r.id,
        user_id: r.user?.email || r.userId,
        created_at: r.createdAt,
      }));

    return {
      restaurants,
      drivers,
    };
  }

  async approveRestaurant(id: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    restaurant.verification_status = 'APPROVED';
    return this.restaurantRepo.save(restaurant);
  }

  async rejectRestaurant(id: string) {
    const restaurant = await this.restaurantRepo.findOne({ where: { id } });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    restaurant.verification_status = 'REJECTED';
    return this.restaurantRepo.save(restaurant);
  }

  async approveDriver(id: string) {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    driver.verification_status = 'APPROVED';
    return this.driverRepo.save(driver);
  }

  async rejectDriver(id: string) {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    driver.verification_status = 'REJECTED';
    return this.driverRepo.save(driver);
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
