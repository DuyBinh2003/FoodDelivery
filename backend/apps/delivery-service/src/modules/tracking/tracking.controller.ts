import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Inject,
  forwardRef,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TrackingService } from '@/modules/tracking/tracking.service.js';
import { TrackingGateway } from '@/modules/tracking/tracking.gateway.js';
import { UpdateDriverLocationDto } from '@/modules/tracking/dto/update-location.dto.js';
import { EstimateDistanceDto } from '@/modules/tracking/dto/estimate-distance.dto.js';
import type { DriverLocationData } from '@/modules/tracking/repositories/driver-location.redis.repository.js';

@Controller('delivery')
export class TrackingController {
  constructor(
    @Inject(TrackingService)
    private readonly trackingService: TrackingService,
    @Inject(forwardRef(() => TrackingGateway))
    private readonly trackingGateway: TrackingGateway,
  ) {}

  @Get('orders/:orderId/location')
  async getOrderLocation(
    @Param('orderId') orderId: string,
  ): Promise<DriverLocationData> {
    return this.trackingService.getLocationByOrderId(orderId);
  }

  @Post('orders/:orderId/location')
  @HttpCode(HttpStatus.OK)
  async updateOrderLocation(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateDriverLocationDto,
  ): Promise<DriverLocationData> {
    // Ensure orderId consistency
    dto.orderId = orderId;
    const locationData = await this.trackingService.updateLocation(dto);
    this.trackingGateway.broadcastLocation(orderId, locationData);
    return locationData;
  }

  @Post('estimate-distance')
  @HttpCode(HttpStatus.OK)
  estimateDistance(@Body() dto: EstimateDistanceDto): {
    distance_km: number;
    estimated_duration_minutes: number;
  } {
    return this.trackingService.estimateDistance(dto);
  }
}
