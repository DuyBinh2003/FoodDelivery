import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TrackingController } from '@/modules/tracking/tracking.controller.js';
import { TrackingService } from '@/modules/tracking/tracking.service.js';
import { TrackingGateway } from '@/modules/tracking/tracking.gateway.js';
import { DriverLocationRedisRepository } from '@/modules/tracking/repositories/driver-location.redis.repository.js';

@Module({
  imports: [ConfigModule],
  controllers: [TrackingController],
  providers: [
    TrackingService,
    TrackingGateway,
    DriverLocationRedisRepository,
  ],
  exports: [
    TrackingService,
    TrackingGateway,
    DriverLocationRedisRepository,
  ],
})
export class TrackingModule {}
