import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispatchController } from '@/modules/dispatch/dispatch.controller.js';
import { DispatchService } from '@/modules/dispatch/dispatch.service.js';
import { DriverGeoRedisRepository } from '@/modules/dispatch/repositories/driver-geo.redis.repository.js';
import { TrackingModule } from '@/modules/tracking/tracking.module.js';
import { StackedTrip } from '@/modules/dispatch/entities/stacked-trip.entity.js';
import { OrderStackingService } from '@/modules/dispatch/services/order-stacking.service.js';
import { OrderStackingController } from '@/modules/dispatch/order-stacking.controller.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([StackedTrip]),
    forwardRef(() => TrackingModule),
  ],
  controllers: [DispatchController, OrderStackingController],
  providers: [
    DispatchService,
    DriverGeoRedisRepository,
    OrderStackingService,
  ],
  exports: [
    DispatchService,
    DriverGeoRedisRepository,
    OrderStackingService,
  ],
})
export class DispatchModule {}
