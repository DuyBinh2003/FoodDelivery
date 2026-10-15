const DEFAULT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000;

function resolveServiceUrl(endpoint: string): { baseUrl: string; path: string } {
  // If full URL is passed
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    const urlObj = new URL(endpoint);
    return { baseUrl: urlObj.origin, path: `${urlObj.pathname}${urlObj.search}` };
  }

  // If a unified API gateway URL is defined
  const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;
  if (gatewayUrl) {
    return {
      baseUrl: gatewayUrl.replace(/\/$/, ''),
      path: endpoint.startsWith('/') ? endpoint : `/${endpoint}`,
    };
  }

  // Normalize path and remove leading slash
  const rawPath = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const isApiPrefix = rawPath.startsWith('api/');
  const pathWithoutApi = isApiPrefix ? rawPath.slice(4) : rawPath;
  const firstSegment = pathWithoutApi.split('/')[0];

  let baseUrl = 'http://localhost:3000';

  switch (firstSegment) {
    case 'users':
    case 'auth':
      baseUrl = process.env.NEXT_PUBLIC_USER_SERVICE_URL || 'http://localhost:3001';
      break;
    case 'admin':
      baseUrl = process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL || 'http://localhost:3002';
      break;
    case 'restaurants':
      baseUrl = process.env.NEXT_PUBLIC_RESTAURANT_SERVICE_URL || 'http://localhost:3003';
      break;
    case 'orders':
      baseUrl = process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || 'http://localhost:3004';
      break;
    case 'delivery':
      baseUrl = process.env.NEXT_PUBLIC_DELIVERY_SERVICE_URL || 'http://localhost:3005';
      break;
    case 'search':
      baseUrl = process.env.NEXT_PUBLIC_SEARCH_SERVICE_URL || 'http://localhost:3006';
      break;
    case 'wallets':
    case 'payment':
    case 'ledger':
      baseUrl = process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL || 'http://localhost:3007';
      break;
    default:
      if (typeof window !== 'undefined') {
        baseUrl = window.location.origin;
      } else {
        baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      }
      break;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    path: `/${pathWithoutApi}`,
  };
}

interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'signal'> {
  params?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Lightweight wrapper around native `fetch()`.
 * Works on both Server Components (RSC) and Client Components.
 * Automatically routes to the appropriate microservice in development and production.
 */
async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { params, body, headers: customHeaders, timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;

  const { baseUrl, path } = resolveServiceUrl(endpoint);
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('access_token='))
      ?.split('=')[1];

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new ApiError(
        response.status,
        `API Error: ${response.statusText} (${response.status})`,
        errorData,
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new ApiError(500, `Fetch Error: ${message}`);
  }
}

export { apiClient, ApiError };
export type { ApiRequestOptions };
