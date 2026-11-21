import { Global, Module } from '@nestjs/common';
import { MetricsService } from '@/common/metrics/metrics.service.js';
import { MetricsController } from '@/common/metrics/metrics.controller.js';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
