import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '@/modules/admin/entities/system-config.entity.js';
import {
  OrderDispute,
  DisputeStatus,
  DisputePriority,
  ResolutionAction,
  PenaltyParty,
} from '@/modules/admin/entities/order-dispute.entity.js';
import { CreateDisputeDto } from '@/modules/admin/dto/create-dispute.dto.js';
import { ResolveDisputeDto } from '@/modules/admin/dto/resolve-dispute.dto.js';
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
  private readonly deliveryUrl = process.env.DELIVERY_SERVICE_URL || 'http://localhost:4005';
  
  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
    @InjectRepository(OrderDispute)
    private readonly disputeRepo: Repository<OrderDispute>,
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

  // --- Customer Support & Dispute Resolution Engine ---

  async createDispute(dto: CreateDisputeDto): Promise<OrderDispute> {
    // 1. Kiểm tra đơn hàng tồn tại từ Order Service
    const orderRes = await fetch(`${this.orderUrl}/internal/orders/${dto.order_id}`).catch((err) => {
      this.logger.warn(`Failed to fetch order ${dto.order_id} from order-service:`, err);
      return null;
    });

    if (!orderRes || !orderRes.ok) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng với mã khiếu nại');
    }

    const orderData = await orderRes.json().catch(() => null);
    if (!orderData) {
      throw new NotFoundException('Không tìm thấy dữ liệu đơn hàng');
    }

    // 2. Kiểm tra thời hạn 24 giờ kể từ khi hoàn tất
    if (orderData.status === 'COMPLETED') {
      const orderCompletedTime = orderData.updated_at
        ? new Date(orderData.updated_at).getTime()
        : new Date(orderData.created_at).getTime();
      const now = Date.now();
      const diffHours = (now - orderCompletedTime) / (1000 * 60 * 60);

      if (diffHours > 24) {
        throw new BadRequestException(
          'Thời hạn tiếp nhận khiếu nại cho đơn hàng này đã kết thúc (tối đa 24h sau giao hàng)',
        );
      }
    }

    // 3. Phân loại độ ưu tiên
    let priority = DisputePriority.NORMAL;
    if (dto.reason_code === 'DAMAGED_FOOD' || dto.reason_code === 'NEVER_ARRIVED') {
      priority = DisputePriority.HIGH;
    }
    if (Number(orderData.total_amount) >= 500000) {
      priority = DisputePriority.URGENT;
    }

    // 4. Tạo ticket khiếu nại
    const dispute = this.disputeRepo.create({
      order_id: dto.order_id,
      customer_id: dto.customer_id,
      reason_code: dto.reason_code,
      description: dto.description,
      evidence_images: dto.evidence_images || [],
      status: DisputeStatus.OPEN,
      priority,
      refund_amount: '0',
    });

    const savedDispute = await this.disputeRepo.save(dispute);
    this.logger.log(`[CreateDispute] Created dispute ${savedDispute.id} for order ${dto.order_id}`);
    return savedDispute;
  }

  async getDisputes(params: {
    status?: string;
    orderId?: string;
    customerId?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const skip = (page - 1) * limit;

    const queryBuilder = this.disputeRepo
      .createQueryBuilder('d')
      .where('d.is_deleted = :isDeleted', { isDeleted: false });

    if (params.status && params.status !== 'ALL') {
      queryBuilder.andWhere('d.status = :status', { status: params.status });
    }
    if (params.orderId) {
      queryBuilder.andWhere('d.order_id = :orderId', { orderId: params.orderId });
    }
    if (params.customerId) {
      queryBuilder.andWhere('d.customer_id = :customerId', { customerId: params.customerId });
    }

    queryBuilder
      .orderBy("CASE d.priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END", 'ASC')
      .addOrderBy('d.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDisputeById(id: string): Promise<OrderDispute> {
    const dispute = await this.disputeRepo.findOne({
      where: { id, is_deleted: false },
    });
    if (!dispute) {
      throw new NotFoundException(`Không tìm thấy ticket khiếu nại: ${id}`);
    }
    return dispute;
  }

  async getDisputeDetails(id: string) {
    const dispute = await this.getDisputeById(id);

    // Fetch song song chi tiết đơn hàng và ảnh POD
    const [orderRes, proofsRes] = await Promise.all([
      fetch(`${this.orderUrl}/internal/orders/${dispute.order_id}`).catch(() => null),
      fetch(`${this.deliveryUrl}/dispatch/proofs/${dispute.order_id}`).catch(() => null),
    ]);

    const order = (orderRes && orderRes.ok) ? await orderRes.json().catch(() => null) : null;
    const driverProofs = (proofsRes && proofsRes.ok) ? await proofsRes.json().catch(() => []) : [];

    return {
      dispute,
      order,
      driverProofs,
    };
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto): Promise<OrderDispute> {
    const dispute = await this.getDisputeById(id);

    if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.INVESTIGATING) {
      throw new ConflictException('Ticket này đã được giải quyết hoặc bác bỏ trước đó');
    }

    if (dto.resolution_action === ResolutionAction.REJECT) {
      dispute.status = DisputeStatus.REJECTED;
      dispute.resolution_action = ResolutionAction.REJECT;
      dispute.resolution_notes = dto.resolution_notes || null;
      if (dto.assigned_cs_id) dispute.assigned_cs_id = dto.assigned_cs_id;
      dispute.resolved_at = new Date();
      return this.disputeRepo.save(dispute);
    }

    // Xử lý bồi hoàn tiền (FULL_REFUND hoặc PARTIAL_REFUND)
    const orderRes = await fetch(`${this.orderUrl}/internal/orders/${dispute.order_id}`).catch(() => null);
    const orderData = (orderRes && orderRes.ok) ? await orderRes.json().catch(() => null) : null;

    let refundAmount = 0;
    if (dto.resolution_action === ResolutionAction.FULL_REFUND) {
      refundAmount = Number(orderData?.total_amount) || 0;
    } else {
      refundAmount = Number(dto.refund_amount) || 0;
    }

    if (refundAmount <= 0) {
      throw new BadRequestException('Số tiền bồi hoàn phải lớn hơn 0');
    }

    const penaltyParty = dto.penalty_party || PenaltyParty.RESTAURANT;
    let penaltyPartyId: string | undefined;
    if (penaltyParty === PenaltyParty.RESTAURANT) {
      penaltyPartyId = orderData?.restaurant_id;
    } else if (penaltyParty === PenaltyParty.DRIVER) {
      penaltyPartyId = orderData?.driver_id;
    }

    // 1. Gọi Sổ cái kép bồi hoàn sang Payment Service
    const paymentRes = await fetch(`${this.paymentUrl}/internal/ledger/dispute-refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disputeId: dispute.id,
        orderId: dispute.order_id,
        customerId: dispute.customer_id,
        refundAmount,
        penaltyParty,
        penaltyPartyId,
        description: dto.resolution_notes,
      }),
    }).catch((err) => {
      this.logger.error(`Failed to execute dispute refund on payment-service:`, err);
      throw new BadRequestException('Không thể thực hiện hoàn tiền sổ cái qua payment-service');
    });

    if (!paymentRes.ok) {
      const err = await paymentRes.json().catch(() => ({ message: 'Lỗi hoàn tiền sổ cái' }));
      throw new BadRequestException(err.message || 'Lỗi hoàn tiền sổ cái');
    }

    // 2. Nếu đơn hàng chưa COMPLETED: Hủy cưỡng chế
    if (orderData && orderData.status !== 'COMPLETED' && orderData.status !== 'CANCELLED') {
      await fetch(`${this.orderUrl}/internal/orders/${dispute.order_id}/force-cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: dto.resolution_notes || 'Khách khiếu nại được CS hoàn tiền' }),
      }).catch((err) => {
        this.logger.warn(`Failed to force-cancel order ${dispute.order_id}:`, err);
      });
    }

    // 3. Cập nhật trạng thái ticket sang RESOLVED
    dispute.status = DisputeStatus.RESOLVED;
    dispute.resolution_action = dto.resolution_action;
    dispute.refund_amount = refundAmount.toString();
    dispute.penalty_party = penaltyParty;
    dispute.resolution_notes = dto.resolution_notes || null;
    if (dto.assigned_cs_id) dispute.assigned_cs_id = dto.assigned_cs_id;
    dispute.resolved_at = new Date();

    const saved = await this.disputeRepo.save(dispute);
    this.logger.log(`[ResolveDispute] Resolved dispute ${dispute.id} with refund ${refundAmount} VND`);
    return saved;
  }

  async rejectDispute(id: string, notes: string, assignedCsId?: string): Promise<OrderDispute> {
    return this.resolveDispute(id, {
      resolution_action: ResolutionAction.REJECT,
      resolution_notes: notes,
      assigned_cs_id: assignedCsId,
    });
  }
}
