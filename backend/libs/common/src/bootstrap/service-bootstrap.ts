import type { INestApplication } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

export type CorsOriginCallback = (err: Error | null, allow?: boolean) => void;

export interface CorsConfigOptions {
  allowedOriginsEnv?: string;
  nodeEnv?: string;
}

const LOCAL_DEV_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

const PRIVATE_LAN_ORIGIN_PATTERN =
  /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)\d{1,3}(\.\d{1,3})?(:\d+)?$/i;

/**
 * Resolves a service listening port strictly from per-service env var,
 * generic `PORT` env var, or explicit default port.
 * Rejects malformed or out-of-range port values fast at startup.
 */
export function resolveServicePort(
  serviceEnvKey: string,
  defaultPort: number,
  env: Record<string, string | undefined> = process.env,
): number {
  const serviceRaw = env[serviceEnvKey]?.trim();
  const genericRaw = env.PORT?.trim();
  const rawValue = serviceRaw && serviceRaw.length > 0 ? serviceRaw : genericRaw;

  if (!rawValue || rawValue.length === 0) {
    if (!Number.isInteger(defaultPort) || defaultPort < 1 || defaultPort > 65535) {
      throw new Error(
        `[BootstrapError] Cổng mặc định không hợp lệ (${defaultPort}) cho "${serviceEnvKey}".`,
      );
    }
    return defaultPort;
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(
      `[BootstrapError] Giá trị cổng không hợp lệ "${rawValue}" tại "${serviceEnvKey}"/PORT. Phải là số nguyên từ 1 đến 65535.`,
    );
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (parsed < 1 || parsed > 65535) {
    throw new Error(
      `[BootstrapError] Cổng ${parsed} nằm ngoài phạm vi hợp lệ (1–65535) tại "${serviceEnvKey}"/PORT.`,
    );
  }

  return parsed;
}

/**
 * Parses comma-separated `CORS_ALLOWED_ORIGINS` env strings into normalized unique origins.
 */
export function parseAllowedCorsOrigins(raw?: string): string[] {
  if (!raw || raw.trim() === '') return [];
  const unique = new Set<string>();

  for (const part of raw.split(',')) {
    const normalized = part.trim().replace(/\/+$/, '');
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

/**
 * Checks whether an origin is a local development host or private LAN origin.
 */
export function isLocalDevOrigin(origin: string): boolean {
  const normalized = origin.trim().replace(/\/+$/, '');
  return (
    LOCAL_DEV_ORIGIN_PATTERN.test(normalized) ||
    PRIVATE_LAN_ORIGIN_PATTERN.test(normalized)
  );
}

/**
 * Builds an origin validator function compatible with NestJS Express CORS & Socket.IO.
 */
export function createCorsOriginValidator(
  options?: CorsConfigOptions,
): (origin: string | undefined, callback: CorsOriginCallback) => void {
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const rawAllowlist =
    options?.allowedOriginsEnv ?? process.env.CORS_ALLOWED_ORIGINS;
  const allowlist = parseAllowedCorsOrigins(rawAllowlist);
  const normalizedAllowlist = new Set(allowlist.map((o) => o.toLowerCase()));

  return (origin: string | undefined, callback: CorsOriginCallback) => {
    // Allow non-browser requests (curl, server-to-server internal HTTP, mobile native)
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.trim().replace(/\/+$/, '').toLowerCase();
    if (normalizedAllowlist.has('*') || normalizedAllowlist.has(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    if (!isProduction && isLocalDevOrigin(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

/**
 * Standard HTTP CORS options shared across all NestJS microservices.
 */
export function buildCorsOptions(options?: CorsConfigOptions): CorsOptions {
  return {
    origin: createCorsOriginValidator(options),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'X-Trace-Id',
      'Idempotency-Key',
      'Cache-Control',
    ],
    exposedHeaders: ['X-Trace-Id', 'traceparent'],
  };
}

/**
 * Enables unified CORS policy on a NestJS HTTP application instance.
 */
export function configureAppCors(
  app: INestApplication,
  options?: CorsConfigOptions,
): void {
  app.enableCors(buildCorsOptions(options));
}

/**
 * Standard Socket.IO CORS configuration aligned with HTTP services.
 */
export function getWsCorsOptions(options?: CorsConfigOptions): {
  origin: (origin: string | undefined, callback: CorsOriginCallback) => void;
  credentials: boolean;
  methods: string[];
} {
  return {
    origin: createCorsOriginValidator(options),
    credentials: true,
    methods: ['GET', 'POST'],
  };
}
