import { getRequiredEnv } from './env.ts';

export interface SocketConnectionConfig {
  url: string;
  path: string;
}

const WS_ENV_KEYS = {
  user: { urlKey: 'NEXT_PUBLIC_USER_WS_URL', pathKey: 'NEXT_PUBLIC_USER_WS_PATH', defaultPath: '/ws/user/socket.io' },
  admin: { urlKey: 'NEXT_PUBLIC_ADMIN_WS_URL', pathKey: 'NEXT_PUBLIC_ADMIN_WS_PATH', defaultPath: '/ws/admin/socket.io' },
  delivery: { urlKey: 'NEXT_PUBLIC_DELIVERY_WS_URL', pathKey: 'NEXT_PUBLIC_DELIVERY_WS_PATH', defaultPath: '/ws/delivery/socket.io' },
} as const;

export type WsServiceTarget = keyof typeof WS_ENV_KEYS;

function readEnvValue(key: string, env?: Record<string, string | undefined>): string | undefined {
  if (env) return env[key];
  switch (key) {
    case 'NEXT_PUBLIC_USER_WS_URL':
      return process.env.NEXT_PUBLIC_USER_WS_URL;
    case 'NEXT_PUBLIC_USER_WS_PATH':
      return process.env.NEXT_PUBLIC_USER_WS_PATH;
    case 'NEXT_PUBLIC_ADMIN_WS_URL':
      return process.env.NEXT_PUBLIC_ADMIN_WS_URL;
    case 'NEXT_PUBLIC_ADMIN_WS_PATH':
      return process.env.NEXT_PUBLIC_ADMIN_WS_PATH;
    case 'NEXT_PUBLIC_DELIVERY_WS_URL':
      return process.env.NEXT_PUBLIC_DELIVERY_WS_URL;
    case 'NEXT_PUBLIC_DELIVERY_WS_PATH':
      return process.env.NEXT_PUBLIC_DELIVERY_WS_PATH;
    default:
      return process.env[key];
  }
}

/**
 * Resolves Socket.IO target URL and isolated NGINX proxy path for a microservice namespace.
 * Supports Same-Origin namespace paths (e.g. `/user` via NGINX `:8080`) or explicit full URLs.
 */
export function resolveSocketConnectionConfig(
  target: WsServiceTarget,
  options?: { env?: Record<string, string | undefined>; windowOrigin?: string },
): SocketConnectionConfig {
  const spec = WS_ENV_KEYS[target];
  const rawUrl = options?.env
    ? options.env[spec.urlKey]?.trim()
    : getRequiredEnv(spec.urlKey).trim();

  if (!rawUrl) {
    throw new Error(
      `[ConfigError] Thiếu biến môi trường bắt buộc: "${spec.urlKey}". Vui lòng kiểm tra file cấu hình .env.local.`,
    );
  }

  const rawPath = readEnvValue(spec.pathKey, options?.env)?.trim();
  const path = rawPath && rawPath.length > 0
    ? (rawPath.startsWith('/') ? rawPath : `/${rawPath}`)
    : spec.defaultPath;

  if (rawUrl.startsWith('/')) {
    const origin =
      options?.windowOrigin?.trim().replace(/\/+$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    return {
      url: origin ? `${origin}${rawUrl}` : rawUrl,
      path,
    };
  }

  return {
    url: rawUrl,
    path,
  };
}
