/**
 * Safely retrieves a required environment variable or throws a descriptive error.
 * Prevents silent fallback to localhost that masks configuration bugs or leaks internal URLs.
 * 
 * NOTE: Next.js / Turbopack only inlines process.env.NEXT_PUBLIC_* into the client bundle
 * when accessed statically (e.g. process.env.NEXT_PUBLIC_XYZ).
 * Dynamic access like process.env[key] returns undefined in browser bundles.
 */

const PUBLIC_ENV_MAP: Record<string, string | undefined> = {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  NEXT_PUBLIC_USER_SERVICE_URL: process.env.NEXT_PUBLIC_USER_SERVICE_URL,
  NEXT_PUBLIC_ADMIN_SERVICE_URL: process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL,
  NEXT_PUBLIC_RESTAURANT_SERVICE_URL: process.env.NEXT_PUBLIC_RESTAURANT_SERVICE_URL,
  NEXT_PUBLIC_ORDER_SERVICE_URL: process.env.NEXT_PUBLIC_ORDER_SERVICE_URL,
  NEXT_PUBLIC_DELIVERY_SERVICE_URL: process.env.NEXT_PUBLIC_DELIVERY_SERVICE_URL,
  NEXT_PUBLIC_SEARCH_SERVICE_URL: process.env.NEXT_PUBLIC_SEARCH_SERVICE_URL,
  NEXT_PUBLIC_PAYMENT_SERVICE_URL: process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL,
  NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT,
  NEXT_PUBLIC_ADMIN_WS_URL: process.env.NEXT_PUBLIC_ADMIN_WS_URL,
  NEXT_PUBLIC_USER_WS_URL: process.env.NEXT_PUBLIC_USER_WS_URL,
  NEXT_PUBLIC_DELIVERY_WS_URL: process.env.NEXT_PUBLIC_DELIVERY_WS_URL,
};

export function getRequiredEnv(key: string): string {
  const value = key in PUBLIC_ENV_MAP ? PUBLIC_ENV_MAP[key] : process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[ConfigError] Thiếu biến môi trường bắt buộc: "${key}". Vui lòng kiểm tra file cấu hình .env.local hoặc biến môi trường server.`
    );
  }
  return value;
}
