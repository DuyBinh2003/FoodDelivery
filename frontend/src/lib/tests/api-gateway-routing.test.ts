/**
 * @file api-gateway-routing.test.ts
 * @description Unit tests (3 branches) verifying Same-Origin NGINX Gateway routing, SSR fallback, reserved Next.js API routes, and isolated WebSocket path resolution.
 * @traceability
 * - Plan: docs/plans/platform/unified-nginx-port-and-cors-architecture.md # Section 5.2
 * - Targets:
 *   - frontend/src/lib/api-url.ts
 *   - frontend/src/lib/ws-config.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveServiceUrl } from '../api-url.ts';
import { resolveSocketConnectionConfig } from '../ws-config.ts';

describe('Unified NGINX Gateway & WebSocket Routing Suite', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_GATEWAY_URL;
    delete process.env.NEXT_PUBLIC_INTERNAL_API_GATEWAY_URL;
    delete process.env.INTERNAL_API_GATEWAY_URL;
    delete process.env.NEXT_PUBLIC_ORDER_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_USER_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_USER_WS_URL;
    delete process.env.NEXT_PUBLIC_USER_WS_PATH;
    delete process.env.NEXT_PUBLIC_ADMIN_WS_URL;
    delete process.env.NEXT_PUBLIC_DELIVERY_WS_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Browser với NEXT_PUBLIC_API_GATEWAY_URL=/api định tuyến /orders/history/me Same-Origin qua NGINX :8080', () => {
      process.env.NEXT_PUBLIC_API_GATEWAY_URL = '/api';
      const resolved = resolveServiceUrl('/orders/history/me', {
        isBrowser: true,
        windowOrigin: 'http://localhost:8080',
      });
      assert.deepStrictEqual(resolved, {
        baseUrl: 'http://localhost:8080',
        path: '/api/orders/history/me',
      });
    });

    it('2. SSR Server tự động dùng INTERNAL_API_GATEWAY_URL (absolute URL) khi client dùng /api tương đối', () => {
      process.env.NEXT_PUBLIC_API_GATEWAY_URL = '/api';
      process.env.NEXT_PUBLIC_INTERNAL_API_GATEWAY_URL = 'http://api-gateway:8080/api';
      const resolved = resolveServiceUrl('/restaurants', { isBrowser: false });
      assert.deepStrictEqual(resolved, {
        baseUrl: 'http://api-gateway:8080',
        path: '/api/restaurants',
      });
    });

    it('3. Định tuyến trực tiếp theo Port Band mới (4001-5001) khi không bật API Gateway', () => {
      process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL = 'http://localhost:4002';
      process.env.NEXT_PUBLIC_USER_SERVICE_URL = 'http://localhost:4001';
      process.env.NEXT_PUBLIC_ORDER_SERVICE_URL = 'http://localhost:4004';

      assert.deepStrictEqual(resolveServiceUrl('/disputes/my-disputes', { isBrowser: true }), {
        baseUrl: 'http://localhost:4002',
        path: '/disputes/my-disputes',
      });
      assert.deepStrictEqual(resolveServiceUrl('/loyalty/me', { isBrowser: true }), {
        baseUrl: 'http://localhost:4001',
        path: '/loyalty/me',
      });
      assert.deepStrictEqual(resolveServiceUrl('/vouchers/available', { isBrowser: true }), {
        baseUrl: 'http://localhost:4004',
        path: '/vouchers/available',
      });
    });

    it('4. resolveSocketConnectionConfig tách chuẩn 3 luồng WebSocket (user/admin/delivery) theo path riêng', () => {
      const cfg = resolveSocketConnectionConfig('delivery', {
        windowOrigin: 'http://localhost:8080',
        env: {
          NEXT_PUBLIC_DELIVERY_WS_URL: '/delivery',
          NEXT_PUBLIC_DELIVERY_WS_PATH: '/ws/delivery/socket.io',
        },
      });
      assert.deepStrictEqual(cfg, {
        url: 'http://localhost:8080/delivery',
        path: '/ws/delivery/socket.io',
      });
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Không nhân đôi /api khi endpoint đã có tiền tố /api/vouchers/...', () => {
      process.env.NEXT_PUBLIC_API_GATEWAY_URL = '/api/';
      const resolved = resolveServiceUrl('/api/vouchers/feed', {
        isBrowser: true,
        windowOrigin: 'http://localhost:8080',
      });
      assert.deepStrictEqual(resolved, {
        baseUrl: 'http://localhost:8080',
        path: '/api/vouchers/feed',
      });
    });

    it('2. Giữ nguyên Same-Origin cho các route nội bộ Next.js (/api/health, /api/routing)', () => {
      process.env.NEXT_PUBLIC_API_GATEWAY_URL = 'http://localhost:8080/api';
      const resolved = resolveServiceUrl('/api/routing?from=10.7,106.6&to=10.8,106.7', {
        isBrowser: true,
        windowOrigin: 'http://localhost:8080',
      });
      assert.deepStrictEqual(resolved, {
        baseUrl: 'http://localhost:8080',
        path: '/api/routing?from=10.7,106.6&to=10.8,106.7',
      });
    });

    it('3. Giữ nguyên Absolute URL và WS URL tường minh không ghi đè origin', () => {
      process.env.NEXT_PUBLIC_API_GATEWAY_URL = '/api';
      assert.deepStrictEqual(
        resolveServiceUrl('https://nominatim.openstreetmap.org/search?q=hcm', { isBrowser: true }),
        {
          baseUrl: 'https://nominatim.openstreetmap.org',
          path: '/search?q=hcm',
        },
      );

      assert.deepStrictEqual(
        resolveSocketConnectionConfig('user', {
          env: { NEXT_PUBLIC_USER_WS_URL: 'http://localhost:4001/user' },
        }),
        {
          url: 'http://localhost:4001/user',
          path: '/ws/user/socket.io',
        },
      );
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('1. Throws descriptive error when endpoint is empty or whitespace only', () => {
      assert.throws(() => resolveServiceUrl('   '), /Endpoint không được để trống/);
    });

    it('2. Fails fast when neither Gateway nor direct service env var is defined on SSR', () => {
      assert.throws(
        () => resolveServiceUrl('/orders/history/me', { isBrowser: false }),
        /\[ConfigError\] Thiếu biến môi trường bắt buộc: "NEXT_PUBLIC_ORDER_SERVICE_URL"/,
      );
    });

    it('3. Throws ConfigError when WebSocket URL env var is missing', () => {
      assert.throws(
        () => resolveSocketConnectionConfig('admin', { env: {} }),
        /\[ConfigError\] Thiếu biến môi trường bắt buộc: "NEXT_PUBLIC_ADMIN_WS_URL"/,
      );
    });
  });
});
