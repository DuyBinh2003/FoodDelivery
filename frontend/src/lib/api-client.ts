import { resolveServiceUrl } from './api-url';
import { extractTraceId } from './trace-utils';

const DEFAULT_TIMEOUT_MS = process.env.NEXT_PUBLIC_API_TIMEOUT
  ? Number(process.env.NEXT_PUBLIC_API_TIMEOUT)
  : 10000;

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | undefined>;
  body?: unknown;
  timeoutMs?: number;
  _isRetry?: boolean;
}

export interface ApiErrorResponse {
  success?: boolean;
  statusCode?: number;
  errorCode?: string;
  traceId?: string;
  message?: string;
  errors?: unknown[];
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  public status: number;
  public statusCode: number;
  public errorCode?: string;
  public traceId?: string;
  public errors?: unknown[];
  public data?: unknown;

  constructor(
    status: number,
    message: string,
    options?: { errorCode?: string; traceId?: string; errors?: unknown[]; data?: unknown }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusCode = status;
    this.errorCode = options?.errorCode;
    this.traceId = options?.traceId;
    this.errors = options?.errors;
    this.data = options?.data;
  }
}

function getDefaultStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy dữ liệu hoặc trang yêu cầu.';
    case 408:
      return 'Yêu cầu quá thời gian phản hồi (Timeout). Vui lòng thử lại.';
    case 409:
      return 'Dữ liệu đã tồn tại hoặc xảy ra xung đột trạng thái.';
    case 422:
      return 'Dữ liệu không đúng định dạng quy định.';
    case 429:
      return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';
    case 500:
      return 'Hệ thống đang bận hoặc gặp sự cố xử lý. Vui lòng thử lại sau.';
    case 502:
    case 503:
    case 504:
      return 'Máy chủ tạm thời gián đoạn hoặc bảo trì. Vui lòng thử lại sau.';
    default:
      return 'Đã có lỗi xảy ra trong quá trình xử lý.';
  }
}

let isRedirectingToLogin = false;

function handleUnauthorizedSession() {
  if (typeof window === 'undefined' || isRedirectingToLogin) return;

  const currentPath = window.location.pathname;
  if (currentPath.startsWith('/login') || currentPath.startsWith('/register')) {
    return;
  }

  isRedirectingToLogin = true;

  // Clear authentication cookies
  document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';

  try {
    localStorage.removeItem('food_delivery_user');
  } catch {}

  const redirectUrl = encodeURIComponent(`${currentPath}${window.location.search}`);
  setTimeout(() => {
    window.location.replace(`/login?expired=1&redirect=${redirectUrl}`);
  }, 1000);
}

/**
 * Helper to retrieve client-side access token from cookie or localStorage
 */
export function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('access_token='))
    ?.split('=')[1];
  if (token) return token;
  try {
    return localStorage.getItem('token') || null;
  } catch {
    return null;
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

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(customHeaders as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = getClientAuthToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      signal: fetchOptions.signal
        ? typeof AbortSignal.any === 'function'
          ? AbortSignal.any([fetchOptions.signal, AbortSignal.timeout(timeoutMs)])
          : fetchOptions.signal
        : AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as ApiErrorResponse | null;

      if (response.status === 401) {
        // Attempt silent Refresh Token Rotation if in browser and not a retry and not auth endpoints
        const isAuthEndpoint =
          endpoint.includes('/auth/login') ||
          endpoint.includes('/auth/refresh') ||
          endpoint.includes('/auth/register');

        if (typeof window !== 'undefined' && !options._isRetry && !isAuthEndpoint) {
          const refreshToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('refresh_token='))
            ?.split('=')[1];

          if (refreshToken) {
            try {
              const refreshData = await apiClient<{ access_token: string; refresh_token?: string }>(
                '/auth/refresh',
                {
                  method: 'POST',
                  body: { refresh_token: refreshToken },
                  _isRetry: true,
                },
              );

              if (refreshData?.access_token) {
                document.cookie = `access_token=${refreshData.access_token}; path=/; max-age=${15 * 60}; SameSite=Lax`;
                if (refreshData.refresh_token) {
                  document.cookie = `refresh_token=${refreshData.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
                }

                return apiClient<T>(endpoint, {
                  ...options,
                  _isRetry: true,
                  headers: {
                    ...(options.headers as Record<string, string>),
                    Authorization: `Bearer ${refreshData.access_token}`,
                  },
                });
              }
            } catch {
              // Refresh failed or blacklisted token, fallback to logout
            }
          }
        }

        handleUnauthorizedSession();
      }

      const backendMessage =
        typeof errorData?.message === 'string' && errorData.message.trim() !== ''
          ? errorData.message
          : undefined;

      const resolvedMessage = backendMessage || getDefaultStatusMessage(response.status);
      const traceId = extractTraceId(response.headers, errorData);

      throw new ApiError(response.status, resolvedMessage, {
        errorCode: errorData?.errorCode,
        traceId,
        errors: errorData?.errors,
        data: errorData,
      });
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(
        408,
        'Yêu cầu quá thời gian chờ (Timeout). Vui lòng kiểm tra lại mạng hoặc thử lại.',
        { errorCode: 'REQUEST_TIMEOUT' },
      );
    }
    throw new ApiError(
      503,
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.',
      { errorCode: 'NETWORK_ERROR' },
    );
  }
}

export { apiClient };
export type { ApiRequestOptions };
