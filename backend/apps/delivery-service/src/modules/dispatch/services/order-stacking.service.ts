import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { calculateHaversineDistanceKm } from '@/common/utils/geo.utils.js';
import { StackedTrip } from '@/modules/dispatch/entities/stacked-trip.entity.js';
import { StackedTripStatus } from '@/modules/dispatch/enums/stacked-trip-status.enum.js';
import { WaypointType } from '@/modules/dispatch/enums/waypoint-type.enum.js';
import type { OrderLocationInfo, OrderWaypoint } from '@/modules/dispatch/interfaces/order-waypoint.interface.js';
import type { CreateStackedTripDto } from '@/modules/dispatch/dto/create-stacked-trip.dto.js';

export interface StackingEvaluationResult {
  eligible: boolean;
  reason?: string;
  pickupDistanceKm: number;
  detourDistanceKm: number;
  bearingDeviationDeg: number;
  totalDistanceKm: number;
  driverBonusEarnings: number;
}

@Injectable()
export class OrderStackingService {
  private readonly logger = new Logger(OrderStackingService.name);

  // Giới hạn ghép cuốc
  private readonly MAX_PICKUP_DISTANCE_KM = 0.8; // Cự ly giữa 2 quán <= 800m
  private readonly MAX_DETOUR_DISTANCE_KM = 2.5; // Đi thêm không quá 2.5km
  private readonly MAX_BEARING_DEVIATION_DEG = 45; // Góc lệch hướng giao <= 45 độ

  constructor(
    @InjectRepository(StackedTrip)
    private readonly stackedTripRepo: Repository<StackedTrip>,
  ) {}

  evaluateEligibility(primary: OrderLocationInfo, candidate: OrderLocationInfo): StackingEvaluationResult {
    if (primary.orderId === candidate.orderId) {
      throw new BadRequestException('Không thể ghép một đơn hàng cho chính nó.');
    }

    // 1. Khoảng cách giữa 2 quán ăn (P1 -> P2)
    const pickupDist = calculateHaversineDistanceKm(
      primary.restaurantLat,
      primary.restaurantLng,
      candidate.restaurantLat,
      candidate.restaurantLng,
    );

    if (pickupDist > this.MAX_PICKUP_DISTANCE_KM) {
      return {
        eligible: false,
        reason: 'RESTAURANTS_TOO_FAR',
        pickupDistanceKm: pickupDist,
        detourDistanceKm: 0,
        bearingDeviationDeg: 0,
        totalDistanceKm: 0,
        driverBonusEarnings: 0,
      };
    }

    // 2. Góc lệch hướng di chuyển (Bearing Deviation)
    const bearing1 = this.calculateBearing(
      primary.restaurantLat,
      primary.restaurantLng,
      primary.deliveryLat,
      primary.deliveryLng,
    );

    const bearing2 = this.calculateBearing(
      candidate.restaurantLat,
      candidate.restaurantLng,
      candidate.deliveryLat,
      candidate.deliveryLng,
    );

    let angleDiff = Math.abs(bearing1 - bearing2);
    if (angleDiff > 180) {
      angleDiff = 360 - angleDiff;
    }
    const bearingDeviation = Math.round(angleDiff * 10) / 10;

    if (bearingDeviation > this.MAX_BEARING_DEVIATION_DEG) {
      return {
        eligible: false,
        reason: 'OPPOSITE_DIRECTIONS',
        pickupDistanceKm: pickupDist,
        detourDistanceKm: 0,
        bearingDeviationDeg: bearingDeviation,
        totalDistanceKm: 0,
        driverBonusEarnings: 0,
      };
    }

    // 3. Tính quãng đường gốc đơn 1
    const originalDist = calculateHaversineDistanceKm(
      primary.restaurantLat,
      primary.restaurantLng,
      primary.deliveryLat,
      primary.deliveryLng,
    );

    // 4. So sánh 2 kịch bản trả hàng để chọn lộ trình tối ưu:
    // Option A: P1 -> P2 -> D1 -> D2
    const distP2_D1 = calculateHaversineDistanceKm(
      candidate.restaurantLat,
      candidate.restaurantLng,
      primary.deliveryLat,
      primary.deliveryLng,
    );
    const distD1_D2 = calculateHaversineDistanceKm(
      primary.deliveryLat,
      primary.deliveryLng,
      candidate.deliveryLat,
      candidate.deliveryLng,
    );
    const totalA = Math.round((pickupDist + distP2_D1 + distD1_D2) * 10) / 10;

    // Option B: P1 -> P2 -> D2 -> D1
    const distP2_D2 = calculateHaversineDistanceKm(
      candidate.restaurantLat,
      candidate.restaurantLng,
      candidate.deliveryLat,
      candidate.deliveryLng,
    );
    const totalB = Math.round((pickupDist + distP2_D2 + distD1_D2) * 10) / 10;

    const minTotalDist = Math.min(totalA, totalB);
    const detourDist = Math.max(0, Math.round((minTotalDist - originalDist) * 10) / 10);

    if (detourDist > this.MAX_DETOUR_DISTANCE_KM) {
      return {
        eligible: false,
        reason: 'DETOUR_TOO_LONG',
        pickupDistanceKm: pickupDist,
        detourDistanceKm: detourDist,
        bearingDeviationDeg: bearingDeviation,
        totalDistanceKm: minTotalDist,
        driverBonusEarnings: 0,
      };
    }

    // Thưởng ghép cuốc cho tài xế: 15.000 + 4.000/km detour
    const bonus = Math.round(15000 + detourDist * 4000);

    return {
      eligible: true,
      pickupDistanceKm: pickupDist,
      detourDistanceKm: detourDist,
      bearingDeviationDeg: bearingDeviation,
      totalDistanceKm: minTotalDist,
      driverBonusEarnings: bonus,
    };
  }

  optimizeWaypoints(primary: OrderLocationInfo, secondary: OrderLocationInfo): OrderWaypoint[] {
    const distP2_D1 = calculateHaversineDistanceKm(
      secondary.restaurantLat,
      secondary.restaurantLng,
      primary.deliveryLat,
      primary.deliveryLng,
    );
    const distP2_D2 = calculateHaversineDistanceKm(
      secondary.restaurantLat,
      secondary.restaurantLng,
      secondary.deliveryLat,
      secondary.deliveryLng,
    );

    const waypoints: OrderWaypoint[] = [
      {
        orderId: primary.orderId,
        type: WaypointType.PICKUP,
        sequence: 0,
        locationName: primary.restaurantName,
        address: primary.restaurantAddress,
        lat: primary.restaurantLat,
        lng: primary.restaurantLng,
        isCompleted: false,
      },
      {
        orderId: secondary.orderId,
        type: WaypointType.PICKUP,
        sequence: 1,
        locationName: secondary.restaurantName,
        address: secondary.restaurantAddress,
        lat: secondary.restaurantLat,
        lng: secondary.restaurantLng,
        isCompleted: false,
      },
    ];

    // Điểm nào gần P2 hơn thì trả trước
    if (distP2_D1 <= distP2_D2) {
      waypoints.push(
        {
          orderId: primary.orderId,
          type: WaypointType.DROPOFF,
          sequence: 2,
          locationName: `Khách hàng đơn ${primary.orderId.slice(0, 8)}`,
          address: primary.deliveryAddress,
          lat: primary.deliveryLat,
          lng: primary.deliveryLng,
          isCompleted: false,
        },
        {
          orderId: secondary.orderId,
          type: WaypointType.DROPOFF,
          sequence: 3,
          locationName: `Khách hàng đơn ${secondary.orderId.slice(0, 8)}`,
          address: secondary.deliveryAddress,
          lat: secondary.deliveryLat,
          lng: secondary.deliveryLng,
          isCompleted: false,
        },
      );
    } else {
      waypoints.push(
        {
          orderId: secondary.orderId,
          type: WaypointType.DROPOFF,
          sequence: 2,
          locationName: `Khách hàng đơn ${secondary.orderId.slice(0, 8)}`,
          address: secondary.deliveryAddress,
          lat: secondary.deliveryLat,
          lng: secondary.deliveryLng,
          isCompleted: false,
        },
        {
          orderId: primary.orderId,
          type: WaypointType.DROPOFF,
          sequence: 3,
          locationName: `Khách hàng đơn ${primary.orderId.slice(0, 8)}`,
          address: primary.deliveryAddress,
          lat: primary.deliveryLat,
          lng: primary.deliveryLng,
          isCompleted: false,
        },
      );
    }

    return waypoints;
  }

  async createStackedTrip(dto: CreateStackedTripDto): Promise<StackedTrip> {
    const evaluation = this.evaluateEligibility(dto.primaryOrder, dto.secondaryOrder);
    if (!evaluation.eligible) {
      throw new BadRequestException(`Không đủ điều kiện ghép đơn: ${evaluation.reason}`);
    }

    const waypoints = this.optimizeWaypoints(dto.primaryOrder, dto.secondaryOrder);
    const estimatedMinutes = Math.max(15, Math.round((evaluation.totalDistanceKm / 25) * 60) + 10);

    const trip = this.stackedTripRepo.create({
      driver_id: dto.driverId,
      primary_order_id: dto.primaryOrder.orderId,
      secondary_order_id: dto.secondaryOrder.orderId,
      status: StackedTripStatus.ACTIVE,
      waypoints,
      current_waypoint_index: 0,
      total_distance_km: evaluation.totalDistanceKm,
      estimated_duration_minutes: estimatedMinutes,
      driver_bonus_earnings: evaluation.driverBonusEarnings,
    });

    return this.stackedTripRepo.save(trip);
  }

  async advanceNextWaypoint(tripId: string, driverId: string): Promise<StackedTrip> {
    const trip = await this.stackedTripRepo.findOne({
      where: { id: tripId, driver_id: driverId, is_deleted: false },
    });

    if (!trip) {
      throw new NotFoundException(`Không tìm thấy chuyến xe ghép ${tripId} của tài xế ${driverId}`);
    }

    if (trip.status !== StackedTripStatus.ACTIVE) {
      throw new BadRequestException(`Chuyến xe ghép đã ở trạng thái ${trip.status}`);
    }

    const currentIndex = trip.current_waypoint_index;
    if (currentIndex >= trip.waypoints.length) {
      throw new BadRequestException('Tất cả các chặng dừng đã được hoàn tất.');
    }

    // Đánh dấu hoàn thành chặng hiện tại
    trip.waypoints[currentIndex].isCompleted = true;
    trip.waypoints[currentIndex].completedAt = new Date().toISOString();

    const nextIndex = currentIndex + 1;
    trip.current_waypoint_index = nextIndex;

    // Nếu đã hoàn thành toàn bộ 4 chặng
    if (nextIndex >= trip.waypoints.length) {
      trip.status = StackedTripStatus.COMPLETED;
      trip.completed_at = new Date();
      this.logger.log(`Stacked trip ${trip.id} completed successfully for driver ${driverId}`);
    }

    return this.stackedTripRepo.save(trip);
  }

  async getActiveStackedTripByDriver(driverId: string): Promise<StackedTrip | null> {
    return this.stackedTripRepo.findOne({
      where: {
        driver_id: driverId,
        status: StackedTripStatus.ACTIVE,
        is_deleted: false,
      },
    });
  }

  /**
   * Tính góc phương vị (Azimuth / Bearing) từ điểm 1 đến điểm 2 theo hệ tọa độ địa lý (đơn vị: độ 0 - 360)
   */
  private calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaLambda = toRad(lon2 - lon1);

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) -
      Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const theta = Math.atan2(y, x);
    return (toDeg(theta) + 360) % 360;
  }
}
