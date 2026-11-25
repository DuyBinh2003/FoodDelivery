import { getRequiredEnv } from './env.ts';

export interface ResolvedServiceUrl {
  baseUrl: string;
  path: string;
}

export interface ResolveServiceUrlOptions {
  windowOrigin?: string;
  isBrowser?: boolean;
}

const RESERVED_FRONTEND_API_ROUTES = new Set(['api/health', 'api/routing']);

function resolveGatewayUrl(
  rawGatewayUrl: string,
  pathWithoutApi: string,
  windowOrigin?: string,
): ResolvedServiceUrl {
  const trimmedGateway = rawGatewayUrl.trim().replace(/\/+$/, '');
  if (trimmedGateway.startsWith('/')) {
    const origin =
      windowOrigin?.trim().replace(/\/+$/, '') ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    if (!origin) {
      throw new Error(
        '[ApiClientError] Không thể dùng Gateway URL tương đối khi chạy ở Server SSR mà thiếu INTERNAL_API_GATEWAY_URL.',
      );
    }
    const prefix = trimmedGateway === '/' ? '' : trimmedGateway;
    return {
      baseUrl: origin,
      path: `${prefix}/${pathWithoutApi}`,
    };
  }

  const parsed = new URL(trimmedGateway);
  const gatewayPrefix = parsed.pathname.replace(/\/+$/, '');
  return {
    baseUrl: parsed.origin,
    path: `${gatewayPrefix}/${pathWithoutApi}`,
  };
}

/**
 * Resolves a logical API endpoint (e.g. `/orders/history/me` or `/api/orders/history/me`)
 * to its target base URL and normalized upstream path.
 * - On Browser: supports Same-Origin `/api` via NGINX (`:8080`) or explicit Gateway URL.
 * - On Server (SSR): prefers `INTERNAL_API_GATEWAY_URL`, then `NEXT_PUBLIC_INTERNAL_API_GATEWAY_URL`,
 *   then direct microservice URL env vars.
 */
export function resolveServiceUrl(
  endpoint: string,
  options?: ResolveServiceUrlOptions,
): ResolvedServiceUrl {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new Error('[ApiClientError] Endpoint không được để trống.');
  }

  // Pass through absolute URLs directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const urlObj = new URL(trimmed);
    return { baseUrl: urlObj.origin, path: `${urlObj.pathname}${urlObj.search}` };
  }

  const rawPath = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const isBrowser =
    options?.isBrowser !== undefined
      ? options.isBrowser
      : Boolean(options?.windowOrigin) || typeof window !== 'undefined';

  // Preserve Next.js internal App Router API endpoints (e.g. /api/health, /api/routing)
  const routeOnly = rawPath.split('?')[0];
  if (RESERVED_FRONTEND_API_ROUTES.has(routeOnly)) {
    const origin = isBrowser
      ? options?.windowOrigin?.trim().replace(/\/+$/, '') || window.location.origin
      : getRequiredEnv('NEXT_PUBLIC_BACKEND_URL').replace(/\/+$/, '');
    return {
      baseUrl: origin,
      path: `/${rawPath}`,
    };
  }

  // Normalize optional `/api/` prefix
  const isApiPrefix = rawPath.startsWith('api/');
  const pathWithoutApi = isApiPrefix ? rawPath.slice(4) : rawPath;
  const firstSegment = pathWithoutApi.split('/')[0];

  const publicGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL?.trim();
  const internalGatewayUrl =
    process.env.INTERNAL_API_GATEWAY_URL?.trim() ||
    process.env.NEXT_PUBLIC_INTERNAL_API_GATEWAY_URL?.trim();

  if (isBrowser && publicGatewayUrl) {
    return resolveGatewayUrl(publicGatewayUrl, pathWithoutApi, options?.windowOrigin);
  }

  if (!isBrowser) {
    if (internalGatewayUrl) {
      return resolveGatewayUrl(internalGatewayUrl, pathWithoutApi);
    }
    if (publicGatewayUrl && !publicGatewayUrl.startsWith('/')) {
      return resolveGatewayUrl(publicGatewayUrl, pathWithoutApi);
    }
  }

  let baseUrl = '';

  switch (firstSegment) {
    case 'users':
    case 'auth':
    case 'loyalty':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_USER_SERVICE_URL');
      break;
    case 'admin':
    case 'disputes':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_ADMIN_SERVICE_URL');
      break;
    case 'restaurants':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_RESTAURANT_SERVICE_URL');
      break;
    case 'orders':
    case 'vouchers':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_ORDER_SERVICE_URL');
      break;
    case 'delivery':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_DELIVERY_SERVICE_URL');
      break;
    case 'search':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_SEARCH_SERVICE_URL');
      break;
    case 'wallets':
    case 'payment':
    case 'ledger':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_PAYMENT_SERVICE_URL');
      break;
    case 'ai':
      baseUrl = getRequiredEnv('NEXT_PUBLIC_AI_SERVICE_URL');
      break;
    default:
      if (isBrowser) {
        baseUrl = options?.windowOrigin || window.location.origin;
      } else {
        baseUrl = getRequiredEnv('NEXT_PUBLIC_BACKEND_URL');
      }
      break;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    path: `/${pathWithoutApi}`,
  };
}
