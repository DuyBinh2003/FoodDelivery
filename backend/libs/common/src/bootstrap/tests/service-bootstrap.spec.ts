/**
 * @file service-bootstrap.spec.ts
 * @description Unit tests (3 branches) for unified microservice dynamic port resolution and shared CORS allowlist policy.
 * @trace
 *   - Plan: docs/plans/platform/unified-nginx-port-and-cors-architecture.md # Section 5.1
 *   - Target: backend/libs/common/src/bootstrap/service-bootstrap.ts
 */

import { describe, it, expect } from 'vitest';
import {
  resolveServicePort,
  parseAllowedCorsOrigins,
  isLocalDevOrigin,
  createCorsOriginValidator,
  buildCorsOptions,
} from '@/common/bootstrap/service-bootstrap.js';

describe('Service Bootstrap — Dynamic Port & Shared CORS Policy', () => {
  // ==========================================
  // NHÁNH 1: HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('resolveServicePort ưu tiên SERVICE_PORT -> PORT -> defaultPort', () => {
      expect(
        resolveServicePort('ORDER_SERVICE_PORT', 4004, {
          ORDER_SERVICE_PORT: '4014',
          PORT: '4999',
        }),
      ).toBe(4014);

      expect(
        resolveServicePort('ORDER_SERVICE_PORT', 4004, {
          PORT: '4004',
        }),
      ).toBe(4004);

      expect(resolveServicePort('ORDER_SERVICE_PORT', 4004, {})).toBe(4004);
    });

    it('parseAllowedCorsOrigins tách chuẩn CSV, cắt khoảng trắng và dấu / cuối', () => {
      const parsed = parseAllowedCorsOrigins(
        ' http://localhost:8080/ , https://food.example.com , http://localhost:3000/ , http://localhost:8080 ',
      );
      expect(parsed).toEqual([
        'http://localhost:8080',
        'https://food.example.com',
        'http://localhost:3000',
      ]);
    });

    it('createCorsOriginValidator cho phép allowlist trong production và localhost ở non-production', () => {
      const prodValidator = createCorsOriginValidator({
        nodeEnv: 'production',
        allowedOriginsEnv: 'https://app.fooddelivery.vn,http://localhost:8080',
      });

      prodValidator('https://app.fooddelivery.vn', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
      });

      const devValidator = createCorsOriginValidator({
        nodeEnv: 'development',
        allowedOriginsEnv: '',
      });

      devValidator('http://localhost:3000', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
      });
    });

    it('buildCorsOptions bật credentials: true và expose tracing headers', () => {
      const opts = buildCorsOptions({
        nodeEnv: 'development',
        allowedOriginsEnv: 'http://localhost:8080',
      });
      expect(opts.credentials).toBe(true);
      expect(opts.exposedHeaders).toEqual(['X-Trace-Id', 'traceparent']);
      expect(opts.allowedHeaders).toContain('X-Trace-Id');
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('Cho phép request server-to-server / curl không có Origin header', () => {
      const prodValidator = createCorsOriginValidator({
        nodeEnv: 'production',
        allowedOriginsEnv: 'https://app.fooddelivery.vn',
      });

      prodValidator(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
      });
    });

    it('So khớp origin không phân biệt hoa/thường và nhận diện IP LAN nội bộ ở chế độ dev', () => {
      expect(isLocalDevOrigin('http://192.168.1.45:8080')).toBe(true);
      expect(isLocalDevOrigin('http://127.0.0.1:3000')).toBe(true);

      const validator = createCorsOriginValidator({
        nodeEnv: 'production',
        allowedOriginsEnv: 'HTTPS://APP.FOODDELIVERY.VN/',
      });
      validator('https://app.fooddelivery.vn', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
      });
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR / REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('resolveServicePort ném lỗi mô tả rõ ràng khi env port sai định dạng hoặc ngoài dải 1..65535', () => {
      expect(() =>
        resolveServicePort('ORDER_SERVICE_PORT', 4004, {
          ORDER_SERVICE_PORT: 'not-a-number',
        }),
      ).toThrow(/BootstrapError/);

      expect(() =>
        resolveServicePort('ORDER_SERVICE_PORT', 4004, {
          ORDER_SERVICE_PORT: '70000',
        }),
      ).toThrow(/1–65535/);

      expect(() =>
        resolveServicePort('ORDER_SERVICE_PORT', 0, {}),
      ).toThrow(/BootstrapError/);
    });

    it('Chặn origin lạ hoặc localhost không có trong allowlist ở production', () => {
      const prodValidator = createCorsOriginValidator({
        nodeEnv: 'production',
        allowedOriginsEnv: 'https://app.fooddelivery.vn',
      });

      prodValidator('https://evil-attacker.com', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(false);
      });

      prodValidator('http://localhost:3100', (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(false);
      });
    });
  });
});
