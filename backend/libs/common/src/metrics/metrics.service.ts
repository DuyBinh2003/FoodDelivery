import { Injectable } from '@nestjs/common';

export interface HttpMetricEntry {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}

@Injectable()
export class MetricsService {
  private readonly startTime = Date.now();
  private wsConnectedClients = 0;
  private readonly requestCounts = new Map<string, number>();
  private readonly requestDurations = new Map<string, { totalMs: number; count: number }>();
  private readonly statusCounts = new Map<number, number>();

  incrementWsClients(): void {
    this.wsConnectedClients++;
  }

  decrementWsClients(): void {
    if (this.wsConnectedClients > 0) {
      this.wsConnectedClients--;
    }
  }

  setWsClients(count: number): void {
    this.wsConnectedClients = Math.max(0, count);
  }

  getWsClients(): number {
    return this.wsConnectedClients;
  }

  recordHttpRequest(entry: HttpMetricEntry): void {
    const key = `${entry.method}_${entry.route}_${entry.statusCode}`;
    this.requestCounts.set(key, (this.requestCounts.get(key) ?? 0) + 1);

    const durationKey = `${entry.method}_${entry.route}`;
    const current = this.requestDurations.get(durationKey) ?? { totalMs: 0, count: 0 };
    current.totalMs += entry.durationMs;
    current.count += 1;
    this.requestDurations.set(durationKey, current);

    this.statusCounts.set(entry.statusCode, (this.statusCounts.get(entry.statusCode) ?? 0) + 1);
  }

  getMetricsSummary(): Record<string, unknown> {
    const mem = process.memoryUsage();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    let totalRequests = 0;
    for (const count of this.requestCounts.values()) {
      totalRequests += count;
    }

    return {
      uptime_seconds: uptimeSec,
      websocket_connected_clients: this.wsConnectedClients,
      memory: {
        rss_bytes: mem.rss,
        heap_total_bytes: mem.heapTotal,
        heap_used_bytes: mem.heapUsed,
        external_bytes: mem.external,
      },
      requests: {
        total: totalRequests,
        status_breakdown: Object.fromEntries(this.statusCounts.entries()),
      },
    };
  }

  getPrometheusMetrics(): string {
    const mem = process.memoryUsage();
    const uptimeSec = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const lines: string[] = [];

    lines.push('# HELP process_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${uptimeSec}`);

    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${mem.rss}`);

    lines.push('# HELP process_heap_used_bytes Process heap used in bytes');
    lines.push('# TYPE process_heap_used_bytes gauge');
    lines.push(`process_heap_used_bytes ${mem.heapUsed}`);

    lines.push('# HELP websocket_connected_clients Current active Socket.IO connections');
    lines.push('# TYPE websocket_connected_clients gauge');
    lines.push(`websocket_connected_clients ${this.wsConnectedClients}`);

    lines.push('# HELP http_requests_total Total number of HTTP requests processed');
    lines.push('# TYPE http_requests_total counter');
    if (this.requestCounts.size === 0) {
      lines.push('http_requests_total{method="GET",route="/health",status="200"} 0');
    } else {
      for (const [key, count] of this.requestCounts.entries()) {
        const [method, route, status] = key.split('_');
        lines.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
      }
    }

    lines.push('# HELP http_request_duration_seconds Average latency per route');
    lines.push('# TYPE http_request_duration_seconds gauge');
    for (const [key, stat] of this.requestDurations.entries()) {
      const [method, route] = key.split('_');
      const avgSec = stat.count > 0 ? (stat.totalMs / stat.count / 1000).toFixed(4) : '0';
      lines.push(`http_request_duration_seconds{method="${method}",route="${route}"} ${avgSec}`);
    }

    return lines.join('\n') + '\n';
  }
}
