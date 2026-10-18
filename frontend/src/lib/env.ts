/**
 * Safely retrieves a required environment variable or throws a descriptive error.
 * Prevents silent fallback to localhost that masks configuration bugs or leaks internal URLs.
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[ConfigError] Thiếu biến môi trường bắt buộc: "${key}". Vui lòng kiểm tra file cấu hình .env.local hoặc biến môi trường server.`
    );
  }
  return value;
}
