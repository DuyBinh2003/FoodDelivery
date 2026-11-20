import { Injectable, Logger, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DriverGeoRedisRepository } from '@/modules/dispatch/repositories/driver-geo.redis.repository.js';
import { UpdateDriverGeoDto } from '@/modules/dispatch/dto/update-driver-geo.dto.js';
import { UpdateDriverStatusDto, DriverOnlineStatus } from '@/modules/dispatch/dto/update-driver-status.dto.js';
import { TrackingGateway } from '@/modules/tracking/tracking.gateway.js';
import { validateGpsPing } from '@/common/geo/anti-spoofing.util.js';
import { rankCandidatesByWeightedScore } from '@/common/geo/weighted-matching.util.js';

export interface TripOfferPayload {
  orderId: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantLat: number;
  restaurantLng: number;
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  distanceKm: number;
  deliveryFee: number;
  driverEarnings: number;
  itemsCount: number;
  timeoutSeconds: number;
  expiresAt: number;
}

export interface DispatchOrderInput {
  orderId: string;
  restaurantName?: string;
  restaurantAddress?: string;
  restaurantLat?: number;
  restaurantLng?: number;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  distanceKm?: number;
  deliveryFee?: number;
  driverEarnings?: number;
  itemsCount?: number;
}

@Injectable()
export class DispatchService {
  private readonly logger = new Logger(DispatchService.name);
  private activeTimers = new Map<string, NodeJS.Timeout>();
  private orderCache = new Map<string, DispatchOrderInput>();
  private lastDriverLocations = new Map<string, { lat: number; lng: number; timestamp: number }>();

  constructor(
    @Inject(DriverGeoRedisRepository)
    private readonly driverGeoRepo: DriverGeoRedisRepository,
    @Inject(forwardRef(() => TrackingGateway))
    private readonly trackingGateway: TrackingGateway,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cập nhật tọa độ GPS của tài xế vào Redis Geospatial kèm Anti-Spoofing kiểm tra nhảy vọt
   */
  async updateDriverLocation(dto: UpdateDriverGeoDto): Promise<{ success: boolean }> {
    const previous = this.lastDriverLocations.get(dto.driver_id);
    const validation = validateGpsPing(
      { lat: dto.lat, lng: dto.lng, timestamp: Date.now() },
      previous,
    );
    if (!validation.isValid) {
      this.logger.warn(`[AntiSpoofing] Rejected GPS ping for driver [${dto.driver_id}]: ${validation.reason}`);
      throw new BadRequestException(validation.reason || 'Tọa độ GPS bất thường hoặc vượt quá giới hạn vật lý');
    }

    this.lastDriverLocations.set(dto.driver_id, {
      lat: dto.lat,
      lng: dto.lng,
      timestamp: Date.now(),
    });

    await this.driverGeoRepo.updateDriverLocation(dto.driver_id, dto.lat, dto.lng);
    return { success: true };
  }

  /**
   * Bật Trực tuyến (ONLINE) hoặc Tắt trực tuyến (OFFLINE)
   */
  async updateDriverStatus(dto: UpdateDriverStatusDto): Promise<{ success: boolean; status: string }> {
    if (dto.status === DriverOnlineStatus.ONLINE && dto.lat != null && dto.lng != null) {
      await this.driverGeoRepo.updateDriverLocation(dto.driver_id, dto.lat, dto.lng);
    } else if (dto.status === DriverOnlineStatus.OFFLINE) {
      await this.driverGeoRepo.removeDriverFromGeo(dto.driver_id);
    }
    return { success: true, status: dto.status };
  }

  /**
   * Khởi động thuật toán tự động chia cuốc (Order Routing) với Dynamic Radius Expansion & Weighted Scoring
   */
  async dispatchOrder(
    orderData: DispatchOrderInput,
    searchRadiiKm: number[] = [3, 5, 7],
  ): Promise<{
    dispatched: boolean;
    candidateCount: number;
    selectedDriverId?: string;
  }> {
    const { orderId } = orderData;
    this.orderCache.set(orderId, orderData);

    const restLat = orderData.restaurantLat ?? 10.772545;
    const restLng = orderData.restaurantLng ?? 106.702758;

    let nearby: Array<{ driverId: string; distanceKm: number }> = [];

    // Dynamic Radius Expansion: Quét bán kính mở rộng dần (vd: 3km -> 5km -> 7km)
    for (const radius of searchRadiiKm) {
      nearby = await this.driverGeoRepo.findNearbyDrivers(restLat, restLng, radius);
      if (nearby && nearby.length > 0) {
        this.logger.log(
          `[DispatchService] Tìm thấy ${nearby.length} tài xế trong bán kính ${radius}km cho đơn [${orderId}].`,
        );
        break;
      }
    }

    if (!nearby || nearby.length === 0) {
      this.logger.warn(
        `[DispatchService] Không tìm thấy tài xế nào trong các bán kính [${searchRadiiKm.join(', ')}]km cho đơn [${orderId}].`,
      );
      return { dispatched: false, candidateCount: 0 };
    }

    // Xếp hạng ứng viên bằng thuật toán Weighted Multi-factor Scoring
    const rankedCandidates = rankCandidatesByWeightedScore(
      nearby.map((n) => ({
        driverId: n.driverId,
        distanceKm: n.distanceKm,
        acceptanceRate: 0.9,
        activeTrips: 0,
      })),
    );

    const candidateDriverIds = rankedCandidates.map((c) => c.driverId);
    this.logger.log(
      `[DispatchService] Đã xếp hạng ${candidateDriverIds.length} tài xế cho đơn [${orderId}]: ${candidateDriverIds.join(', ')}`,
    );

    // Khởi tạo phiên điều phối 15 giây
    const session = await this.driverGeoRepo.createDispatchSession(orderId, candidateDriverIds, 15);
    if (!session.currentCandidate) {
      return { dispatched: false, candidateCount: 0 };
    }

    // Bắn offer tới tài xế ưu tiên cao nhất
    await this.offerTripToDriver(session.currentCandidate, orderData, 15);

    return {
      dispatched: true,
      candidateCount: candidateDriverIds.length,
      selectedDriverId: session.currentCandidate,
    };
  }

  /**
   * Bắn offer tới tài xế được chọn và kích hoạt timer 15 giây
   */
  private async offerTripToDriver(
    driverId: string,
    orderData: DispatchOrderInput,
    timeoutSeconds: number = 15,
  ): Promise<void> {
    const timerKey = `${orderData.orderId}:${driverId}`;
    if (this.activeTimers.has(timerKey)) {
      clearTimeout(this.activeTimers.get(timerKey)!);
    }

    const expiresAt = Date.now() + timeoutSeconds * 1000;
    const offerPayload: TripOfferPayload = {
      orderId: orderData.orderId,
      restaurantName: orderData.restaurantName || 'Nhà hàng',
      restaurantAddress: orderData.restaurantAddress || '',
      restaurantLat: orderData.restaurantLat ?? 10.772545,
      restaurantLng: orderData.restaurantLng ?? 106.702758,
      deliveryAddress: orderData.deliveryAddress || 'Địa chỉ giao hàng',
      deliveryLat: orderData.deliveryLat ?? 10.77653,
      deliveryLng: orderData.deliveryLng ?? 106.70098,
      distanceKm: orderData.distanceKm ?? 2.5,
      deliveryFee: orderData.deliveryFee ?? 15000,
      driverEarnings: orderData.driverEarnings ?? 13500,
      itemsCount: orderData.itemsCount ?? 1,
      timeoutSeconds,
      expiresAt,
    };

    // Bắn sự kiện WebSocket tới room của tài xế
    this.trackingGateway.sendTripOffer(driverId, offerPayload);
    this.logger.log(
      `[DispatchService] Đã bắn sự kiện driver:trip_offer tới driver [${driverId}] cho đơn [${orderData.orderId}] (Countdown 15s).`,
    );

    // Kích hoạt timer đếm ngược 15 giây
    const timer = setTimeout(async () => {
      this.logger.log(`[DispatchService] Hết thời gian 15s cho tài xế [${driverId}] với đơn [${orderData.orderId}]. Tự động chuyển tiếp...`);
      this.activeTimers.delete(timerKey);
      await this.handleTimeout(orderData.orderId, driverId);
    }, timeoutSeconds * 1000);

    this.activeTimers.set(timerKey, timer);
  }

  /**
   * Xử lý khi tài xế hết 15 giây mà không phản hồi
   */
  async handleTimeout(orderId: string, driverId: string): Promise<void> {
    this.trackingGateway.cancelTripOffer(driverId, orderId);

    const { nextDriverId, isExhausted } = await this.driverGeoRepo.recordRejectionAndAdvance(orderId, driverId, 15);
    const orderData = this.orderCache.get(orderId);

    if (nextDriverId && !isExhausted && orderData) {
      this.logger.log(`[DispatchService] Tự động chuyển cuốc [${orderId}] cho tài xế kế tiếp [${nextDriverId}].`);
      await this.offerTripToDriver(nextDriverId, orderData, 15);
    } else {
      this.logger.warn(`[DispatchService] Toàn bộ tài xế trong bán kính đã từ chối/hết giờ với đơn [${orderId}].`);
      await this.driverGeoRepo.clearDispatchSession(orderId);
      this.orderCache.delete(orderId);
    }
  }

  /**
   * Xử lý khi tài xế chủ động bấm Từ Chối (Reject)
   */
  async rejectTrip(orderId: string, driverId: string, reason?: string): Promise<{
    success: boolean;
    nextDriverId: string | null;
    isExhausted: boolean;
  }> {
    const timerKey = `${orderId}:${driverId}`;
    if (this.activeTimers.has(timerKey)) {
      clearTimeout(this.activeTimers.get(timerKey)!);
      this.activeTimers.delete(timerKey);
    }

    this.logger.log(`[DispatchService] Driver [${driverId}] từ chối cuốc [${orderId}] (Lý do: ${reason || 'Không nêu'}).`);
    this.trackingGateway.cancelTripOffer(driverId, orderId);

    const { nextDriverId, isExhausted } = await this.driverGeoRepo.recordRejectionAndAdvance(orderId, driverId, 15);
    const orderData = this.orderCache.get(orderId);

    if (nextDriverId && !isExhausted && orderData) {
      this.logger.log(`[DispatchService] Chuyển tiếp cuốc [${orderId}] cho tài xế [${nextDriverId}].`);
      await this.offerTripToDriver(nextDriverId, orderData, 15);
    } else if (isExhausted) {
      await this.driverGeoRepo.clearDispatchSession(orderId);
      this.orderCache.delete(orderId);
    }

    return { success: true, nextDriverId, isExhausted };
  }

  /**
   * Xử lý khi tài xế bấm Chấp Nhận (Accept)
   */
  async acceptTrip(orderId: string, driverId: string): Promise<{ success: boolean; orderId: string; driverId: string }> {
    const timerKey = `${orderId}:${driverId}`;
    if (this.activeTimers.has(timerKey)) {
      clearTimeout(this.activeTimers.get(timerKey)!);
      this.activeTimers.delete(timerKey);
    }

    const accepted = await this.driverGeoRepo.acceptDispatchSession(orderId, driverId);
    if (!accepted) {
      throw new BadRequestException('Cuốc xe đã hết thời gian phản hồi hoặc đã được gán cho tài xế khác.');
    }

    this.logger.log(`[DispatchService] Driver [${driverId}] chấp nhận thành công cuốc [${orderId}]!`);

    // Thông báo cho order-service
    try {
      const orderUrl = this.configService.get<string>('services.orderUrl') || 'http://localhost:3004';
      await fetch(`${orderUrl}/orders/${orderId}/driver-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      }).catch((e: unknown) => {
        this.logger.warn(`Không thể thông báo tới order-service: ${e}`);
      });
    } catch {
      // Continue
    }

    await this.driverGeoRepo.clearDispatchSession(orderId);
    this.orderCache.delete(orderId);

    return { success: true, orderId, driverId };
  }
}
