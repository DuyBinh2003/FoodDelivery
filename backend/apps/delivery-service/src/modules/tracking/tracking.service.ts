import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { calculateHaversineDistanceKm } from '@/common/utils/geo.utils.js';
import {
  DriverLocationRedisRepository,
  type DriverLocationData,
} from '@/modules/tracking/repositories/driver-location.redis.repository.js';
import { UpdateDriverLocationDto } from '@/modules/tracking/dto/update-location.dto.js';
import { EstimateDistanceDto } from '@/modules/tracking/dto/estimate-distance.dto.js';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);
  private readonly AVERAGE_CITY_SPEED_KMH = 25; // 25 km/h in urban delivery

  constructor(
    @Inject(DriverLocationRedisRepository)
    private readonly redisRepo: DriverLocationRedisRepository,
  ) {}

  async updateLocation(dto: UpdateDriverLocationDto): Promise<DriverLocationData> {
    let remainingKm: number | null = null;
    let etaMinutes: number | null = null;

    if (
      dto.dropoff_lat !== undefined &&
      dto.dropoff_lat !== null &&
      dto.dropoff_lng !== undefined &&
      dto.dropoff_lng !== null
    ) {
      remainingKm = calculateHaversineDistanceKm(
        dto.lat,
        dto.lng,
        dto.dropoff_lat,
        dto.dropoff_lng,
      );
      if (remainingKm === 0) {
        etaMinutes = 1;
      } else {
        etaMinutes = Math.max(1, Math.round((remainingKm / this.AVERAGE_CITY_SPEED_KMH) * 60));
      }
    }

    const locationData: DriverLocationData = {
      orderId: dto.orderId,
      driverId: dto.driverId,
      lat: dto.lat,
      lng: dto.lng,
      heading: dto.heading,
      speed: dto.speed,
      remaining_km: remainingKm,
      eta_minutes: etaMinutes,
      updatedAt: new Date().toISOString(),
    };

    await this.redisRepo.saveOrderDriverLocation(dto.orderId, locationData);
    this.logger.debug(
      `Updated driver location for order ${dto.orderId} (driver ${dto.driverId}): lat ${dto.lat}, lng ${dto.lng}, remaining: ${remainingKm}km`,
    );

    return locationData;
  }

  async getLocationByOrderId(orderId: string): Promise<DriverLocationData> {
    const location = await this.redisRepo.getOrderDriverLocation(orderId);
    if (!location) {
      throw new NotFoundException(`No real-time location found for order ${orderId}`);
    }
    return location;
  }

  estimateDistance(dto: EstimateDistanceDto): {
    distance_km: number;
    estimated_duration_minutes: number;
  } {
    const distanceKm = calculateHaversineDistanceKm(
      dto.origin_lat,
      dto.origin_lng,
      dto.destination_lat,
      dto.destination_lng,
    );

    const estimatedDurationMinutes =
      distanceKm === 0
        ? 0
        : Math.max(2, Math.round((distanceKm / this.AVERAGE_CITY_SPEED_KMH) * 60));

    return {
      distance_km: distanceKm,
      estimated_duration_minutes: estimatedDurationMinutes,
    };
  }
}
