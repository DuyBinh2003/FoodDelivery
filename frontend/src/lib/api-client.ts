const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | undefined>;
  body?: unknown;
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
 *
 * @example
 * // Simple GET
 * const categories = await apiClient<Category[]>('/api/search/categories');
 *
 * // GET with query params
 * const menu = await apiClient<MenuSection[]>('/api/search/menu', {
 *   params: { q: 'pizza', category: 'italian' },
 * });
 *
 * // POST with body
 * const order = await apiClient<Order>('/api/orders', {
 *   method: 'POST',
 *   body: { items: [...] },
 * });
 */
async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { params, body, headers: customHeaders, ...fetchOptions } = options;

  // Build URL with query params
  const url = new URL(`${BACKEND_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers,
    body: body ? JSON.stringify(body) : undefined,
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
}

export { apiClient, ApiError };
export type { ApiRequestOptions };
