import { Controller, Get, Header, Res } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from '@/common/metrics/metrics.service.js';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(@Res() res: Response) {
    const prometheusText = this.metricsService.getPrometheusMetrics();
    return res.send(prometheusText);
  }

  @Get('health/apm')
  getApmStatus() {
    return {
      status: 'UP',
      apm: this.metricsService.getMetricsSummary(),
      timestamp: new Date().toISOString(),
    };
  }
}
