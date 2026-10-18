import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';
import { ReviewApprovalDto, ApprovalStatus } from '@/modules/admin/dto/review-approval.dto.js';

export const DEFAULT_SYSTEM_CONFIGS: Array<{
  config_key: string;
  config_value: string;
  description: string;
}> = [
  { config_key: 'RESTAURANT_COMMISSION_RATE', config_value: '20', description: 'Tỷ lệ hoa hồng chiết khấu nhà hàng (%)' },
  { config_key: 'DRIVER_FEE_RATE', config_value: '10', description: 'Tỷ lệ phí nền tảng trích từ cuốc xe tài xế (%)' },
  { config_key: 'TAX_RATE', config_value: '8', description: 'Thuế suất VAT (%)' },
  { config_key: 'BASE_DELIVERY_FEE_VND', config_value: '15000', description: 'Cước phí giao hàng cơ sở tối thiểu (VNĐ)' },
  { config_key: 'MIN_ORDER_AMOUNT_VND', config_value: '20000', description: 'Giá trị đơn hàng tối thiểu để đặt món (VNĐ)' },
  { config_key: 'MAX_DELIVERY_RADIUS_KM', config_value: '15', description: 'Bán kính giao hàng tối đa giữa quán và khách (km)' },
  { config_key: 'DRIVER_ACCEPT_TIMEOUT_SECONDS', config_value: '30', description: 'Thời gian đếm ngược tài xế bấm nhận cuốc (giây)' },
  { config_key: 'AUTO_CANCEL_UNACCEPTED_ORDER_MINUTES', config_value: '15', description: 'Thời gian tự hủy đơn nếu không có quán/tài xế nhận (phút)' },
  { config_key: 'DEFAULT_PAGE_SIZE', config_value: '15', description: 'Kích thước trang mặc định cho các bảng danh sách' },
  { config_key: 'MAX_EXPORT_LIMIT', config_value: '500', description: 'Giới hạn tối đa số bản ghi khi trích xuất dữ liệu' },
  { config_key: 'MAINTENANCE_MODE', config_value: 'false', description: 'Bật/tắt chế độ bảo trì toàn hệ sinh thái' },
  { config_key: 'AUTO_APPROVE_PARTNERS', config_value: 'false', description: 'Tự động duyệt hồ sơ đối tác quán & tài xế khi đăng ký' },
];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly userUrl = process.env.USER_SERVICE_URL!;
  private readonly restaurantUrl = process.env.RESTAURANT_SERVICE_URL!;
  private readonly orderUrl = process.env.ORDER_SERVICE_URL!;
  private readonly paymentUrl = process.env.PAYMENT_SERVICE_URL!;
  
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  async getDashboardMetrics() {
    const [usersRes, restaurantsRes, ordersRes, treasuryRes] = await Promise.all([
      fetch(`${this.userUrl}/internal/users/metrics`).catch((err) => {
        this.logger.warn('Failed to fetch users metrics:', err);
        return null;
      }),
      fetch(`${this.restaurantUrl}/internal/restaurants/metrics`).catch((err) => {
        this.logger.warn('Failed to fetch restaurant metrics:', err);
        return null;
      }),
      fetch(`${this.orderUrl}/internal/orders/metrics`).catch((err) => {
        this.logger.warn('Failed to fetch order metrics:', err);
        return null;
      }),
      fetch(`${this.paymentUrl}/internal/ledger/platform-summary`).catch((err) => {
        this.logger.warn('Failed to fetch platform treasury summary:', err);
        return null;
      }),
    ]);

    const usersData = (usersRes && usersRes.ok) ? await usersRes.json().catch(() => ({})) : {};
    const restaurantsData = (restaurantsRes && restaurantsRes.ok) ? await restaurantsRes.json().catch(() => ({})) : {};
    const ordersData = (ordersRes && ordersRes.ok) ? await ordersRes.json().catch(() => ({})) : {};
    const treasuryData = (treasuryRes && treasuryRes.ok) ? await treasuryRes.json().catch(() => ({})) : {};

    return {
      totalUsers: Number(usersData.totalUsers) || 0,
      totalRestaurants: Number(restaurantsData.totalRestaurants) || 0,
      totalDrivers: Number(usersData.totalDrivers) || 0,
      totalOrders: Number(ordersData.totalOrders) || 0,
      totalGmv: Number(ordersData.totalGmv) || 0,
      treasuryBalance: Number(treasuryData.available_balance) || 0,
      totalRevenue: Number(treasuryData.total_revenue) || 0,
    };
  }

  async getDashboardAnalytics(range: '7d' | '30d' | 'all' = '7d') {
    let isRealtimeDegraded = false;

    const [metricsRes, timeseriesRes, treasuryRes] = await Promise.all([
      this.getDashboardMetrics().catch((err) => {
        this.logger.warn('Failed to load dashboard metrics for analytics:', err);
        isRealtimeDegraded = true;
        return {
          totalUsers: 0,
          totalRestaurants: 0,
          totalDrivers: 0,
          totalOrders: 0,
          totalGmv: 0,
          treasuryBalance: 0,
          totalRevenue: 0,
        };
      }),
      fetch(`${this.orderUrl}/internal/orders/analytics-timeseries?range=${range}`).catch((err) => {
        this.logger.warn(`Failed to fetch orders analytics timeseries (${range}):`, err);
        isRealtimeDegraded = true;
        return null;
      }),
      fetch(`${this.paymentUrl}/internal/ledger/platform-summary`).catch((err) => {
        this.logger.warn('Failed to fetch treasury for analytics:', err);
        isRealtimeDegraded = true;
        return null;
      }),
    ]);

    const timeseriesData = (timeseriesRes && timeseriesRes.ok) ? await timeseriesRes.json().catch(() => null) : null;
    const treasuryData = (treasuryRes && treasuryRes.ok) ? await treasuryRes.json().catch(() => ({})) : {};

    const rawTimeseries = timeseriesData?.timeseries || [];
    const statusDistribution = timeseriesData?.statusDistribution || {};

    const restaurantCommission = Number(treasuryData.restaurant_commission_revenue) || 0;
    const driverTripCommission = Number(treasuryData.driver_trip_commission_revenue) || 0;

    // Tính toán tỷ trọng doanh thu
    const revenueBreakdown = [
      { name: 'Chiết khấu Nhà hàng', value: restaurantCommission, color: '#f97316' },
      { name: 'Chiết khấu Cuốc xe', value: driverTripCommission, color: '#10b981' },
    ];

    // Bổ sung ước tính platform_revenue theo từng ngày trong timeseries
    const formattedTimeseries = rawTimeseries.map((item: { date: string; gmv: number; orders: number; completed_orders: number }) => ({
      date: item.date,
      gmv: item.gmv,
      orders: item.orders,
      completed_orders: item.completed_orders,
      platform_revenue: Math.round(item.gmv * 0.15 + item.completed_orders * 2500),
    }));

    return {
      metrics: {
        ...metricsRes,
        treasuryBalance: Number(treasuryData.available_balance) || metricsRes.treasuryBalance || 0,
        totalRevenue: Number(treasuryData.total_revenue) || metricsRes.totalRevenue || 0,
        restaurantCommission,
        driverTripCommission,
      },
      timeseries: formattedTimeseries,
      statusDistribution,
      revenueBreakdown,
      recentTreasuryTransactions: treasuryData.recent_transactions || [],
      isRealtimeDegraded,
      range,
    };
  }

  async getPlatformWalletSummary(page = 1, limit = 20) {
    const res = await fetch(`${this.paymentUrl}/internal/ledger/platform-summary?page=${page}&limit=${limit}`).catch((err) => {
      this.logger.warn('Failed to fetch platform treasury summary:', err);
      return null;
    });

    if (!res || !res.ok) {
      return {
        account_id: '',
        account_code: 'SYS_REVENUE_PLATFORM_COMMISSION',
        currency: 'VND',
        available_balance: 0,
        total_revenue: 0,
        restaurant_commission_revenue: 0,
        driver_trip_commission_revenue: 0,
        other_revenue: 0,
        recent_transactions: [],
        total_transactions_count: 0,
      };
    }

    return res.json().catch(() => ({
      account_id: '',
      account_code: 'SYS_REVENUE_PLATFORM_COMMISSION',
      currency: 'VND',
      available_balance: 0,
      total_revenue: 0,
      restaurant_commission_revenue: 0,
      driver_trip_commission_revenue: 0,
      other_revenue: 0,
      recent_transactions: [],
      total_transactions_count: 0,
    }));
  }

  async getAdminOrders(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const p = query.page || 1;
    const l = query.limit || 20;
    const statusParam = query.status ? `&status=${query.status}` : '';
    const searchParam = query.search ? `&search=${encodeURIComponent(query.search)}` : '';

    const res = await fetch(`${this.orderUrl}/internal/orders/admin-list?page=${p}&limit=${l}${statusParam}${searchParam}`).catch((err) => {
      this.logger.warn('Failed to fetch admin orders:', err);
      return null;
    });

    if (!res || !res.ok) {
      return { data: [], total: 0, page: p, limit: l, totalPages: 0 };
    }
    return res.json().catch(() => ({ data: [], total: 0, page: p, limit: l, totalPages: 0 }));
  }

  async getAdminUsers(query: { page?: number; limit?: number; role?: string; search?: string }) {
    const p = query.page || 1;
    const l = query.limit || 20;
    const roleParam = query.role ? `&role=${query.role}` : '';
    const searchParam = query.search ? `&search=${encodeURIComponent(query.search)}` : '';

    const res = await fetch(`${this.userUrl}/internal/users/admin-list?page=${p}&limit=${l}${roleParam}${searchParam}`).catch((err) => {
      this.logger.warn('Failed to fetch admin users:', err);
      return null;
    });

    if (!res || !res.ok) {
      return { data: [], total: 0, page: p, limit: l, totalPages: 0 };
    }
    return res.json().catch(() => ({ data: [], total: 0, page: p, limit: l, totalPages: 0 }));
  }

  async getAdminDrivers(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const p = query.page || 1;
    const l = query.limit || 20;
    const statusParam = query.status ? `&status=${query.status}` : '';
    const searchParam = query.search ? `&search=${encodeURIComponent(query.search)}` : '';

    const res = await fetch(`${this.userUrl}/internal/drivers/admin-list?page=${p}&limit=${l}${statusParam}${searchParam}`).catch((err) => {
      this.logger.warn('Failed to fetch admin drivers:', err);
      return null;
    });

    if (!res || !res.ok) {
      return { data: [], total: 0, page: p, limit: l, totalPages: 0 };
    }
    return res.json().catch(() => ({ data: [], total: 0, page: p, limit: l, totalPages: 0 }));
  }

  async getAdminRestaurants(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const p = query.page || 1;
    const l = query.limit || 20;
    const statusParam = query.status ? `&status=${query.status}` : '';
    const searchParam = query.search ? `&search=${encodeURIComponent(query.search)}` : '';

    const res = await fetch(`${this.restaurantUrl}/internal/restaurants/admin-list?page=${p}&limit=${l}${statusParam}${searchParam}`).catch((err) => {
      this.logger.warn('Failed to fetch admin restaurants:', err);
      return null;
    });

    if (!res || !res.ok) {
      return { data: [], total: 0, page: p, limit: l, totalPages: 0 };
    }
    return res.json().catch(() => ({ data: [], total: 0, page: p, limit: l, totalPages: 0 }));
  }

  async getPendingApprovals() {
    const res = await fetch(`${this.userUrl}/internal/users/pending-approvals`).catch((err) => {
      this.logger.warn('Failed to fetch pending approvals:', err);
      return null;
    });
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
    const existing = await this.configRepo.find();
    const existingKeys = new Set(existing.map((c) => c.config_key));

    const missingConfigs = DEFAULT_SYSTEM_CONFIGS.filter((def) => !existingKeys.has(def.config_key));
    if (missingConfigs.length > 0) {
      for (const missing of missingConfigs) {
        try {
          const entity = this.configRepo.create({
            config_key: missing.config_key,
            config_value: missing.config_value,
            description: missing.description,
          });
          const saved = await this.configRepo.save(entity);
          existing.push(saved);
        } catch (err) {
          this.logger.warn(`Failed to seed missing config ${missing.config_key}:`, err);
        }
      }
    }

    return existing;
  }

  async updateConfig(key: string, value: string) {
    let config = await this.configRepo.findOne({ where: { config_key: key } });
    if (!config) {
      const defaultDef = DEFAULT_SYSTEM_CONFIGS.find((d) => d.config_key === key);
      config = this.configRepo.create({
        config_key: key,
        config_value: value,
        description: defaultDef?.description || `Cấu hình ${key}`,
      });
    } else {
      config.config_value = value;
    }
    return this.configRepo.save(config);
  }

  async updateBulkConfigs(items: Array<{ key: string; value: string }>) {
    const results: SystemConfig[] = [];
    for (const item of items) {
      let config = await this.configRepo.findOne({ where: { config_key: item.key } });
      if (!config) {
        const defaultDef = DEFAULT_SYSTEM_CONFIGS.find((d) => d.config_key === item.key);
        config = this.configRepo.create({
          config_key: item.key,
          config_value: item.value,
          description: defaultDef?.description || `Cấu hình ${item.key}`,
        });
      } else {
        config.config_value = item.value;
      }
      const saved = await this.configRepo.save(config);
      results.push(saved);
    }
    return results;
  }
}
