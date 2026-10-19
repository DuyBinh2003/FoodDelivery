import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DispatchController } from '@/modules/dispatch/dispatch.controller.js';
import { DispatchService } from '@/modules/dispatch/dispatch.service.js';
import { DriverGeoRedisRepository } from '@/modules/dispatch/repositories/driver-geo.redis.repository.js';
import { TrackingModule } from '@/modules/tracking/tracking.module.js';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => TrackingModule),
  ],
  controllers: [DispatchController],
  providers: [
    DispatchService,
    DriverGeoRedisRepository,
  ],
  exports: [
    DispatchService,
    DriverGeoRedisRepository,
  ],
})
export class DispatchModule {}
