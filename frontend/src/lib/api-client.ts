const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

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
 */
async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { params, body, headers: customHeaders, timeoutMs = 10000, ...fetchOptions } = options;

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
