/**
 * @file metrics.service.spec.ts
 * @description Kiểm thử MetricsService thu thập APM metrics chuẩn Prometheus và JSON
 * @trace docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md
 * @plan docs/plans/platform/websocket-scaling-redis-adapter-and-apm.md # Testing Policy Compliance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsService } from '@/common/metrics/metrics.service.js';

describe('MetricsService [Issue #89 Distributed APM]', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('Nhánh 1: Happy Path (Thu thập metrics và sinh Prometheus text)', () => {
    it('[Requirement/Issue #89] [Branch: Happy] Ghi nhận HTTP requests và xuất định dạng Prometheus text', () => {
      service.recordHttpRequest({
        method: 'POST',
        route: '/orders',
        statusCode: 201,
        durationMs: 45,
      });

      service.recordHttpRequest({
        method: 'POST',
        route: '/orders',
        statusCode: 201,
        durationMs: 55,
      });

      const text = service.getPrometheusMetrics();

      expect(text).toContain('# TYPE http_requests_total counter');
      expect(text).toContain('http_requests_total{method="POST",route="/orders",status="201"} 2');
      expect(text).toContain('# TYPE http_request_duration_seconds gauge');
      expect(text).toContain('http_request_duration_seconds{method="POST",route="/orders"} 0.0500');
    });

    it('[Requirement/Issue #89] [Branch: Happy] Quản lý số lượng WebSocket clients kết nối', () => {
      service.incrementWsClients();
      service.incrementWsClients();
      expect(service.getWsClients()).toBe(2);

      service.decrementWsClients();
      expect(service.getWsClients()).toBe(1);

      const summary = service.getMetricsSummary();
      expect(summary.websocket_connected_clients).toBe(1);
    });
  });

  describe('Nhánh 2: Edge Cases (Không bị âm client count & summary đầy đủ)', () => {
    it('[Requirement/Issue #89] [Branch: Edge] Không giảm websocket clients xuống dưới 0 khi gọi decrement quá mức', () => {
      service.decrementWsClients();
      service.decrementWsClients();
      expect(service.getWsClients()).toBe(0);
    });

    it('[Requirement/Issue #89] [Branch: Edge] getMetricsSummary phản ánh chi tiết bộ nhớ RAM và trạng thái status codes', () => {
      service.recordHttpRequest({
        method: 'GET',
        route: '/restaurants',
        statusCode: 200,
        durationMs: 15,
      });

      const summary = service.getMetricsSummary() as {
        memory: { rss_bytes: number; heap_used_bytes: number };
        requests: { total: number; status_breakdown: Record<number, number> };
      };

      expect(summary.memory.rss_bytes).toBeGreaterThan(0);
      expect(summary.requests.total).toBe(1);
      expect(summary.requests.status_breakdown[200]).toBe(1);
    });
  });

  describe('Nhánh 3: Error & Rejection Flow (Ghi nhận request lỗi 500)', () => {
    it('[Requirement/Issue #89] [Branch: Error] Ghi nhận HTTP 500 vào status_breakdown và Prometheus metrics', () => {
      service.recordHttpRequest({
        method: 'GET',
        route: '/delivery/socket.io',
        statusCode: 500,
        durationMs: 120,
      });

      const summary = service.getMetricsSummary() as {
        requests: { total: number; status_breakdown: Record<number, number> };
      };

      expect(summary.requests.status_breakdown[500]).toBe(1);
      const text = service.getPrometheusMetrics();
      expect(text).toContain('http_requests_total{method="GET",route="/delivery/socket.io",status="500"} 1');
    });
  });
});
