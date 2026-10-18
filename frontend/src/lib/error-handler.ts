import toast from 'react-hot-toast';
import { ApiError } from './api-client';

/**
 * Extracts a safe, user-friendly Vietnamese error message from any error type.
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
): string {
  if (error instanceof ApiError) {
    if (error.message && error.message.trim() !== '') {
      return error.message;
    }
  }

  if (error instanceof Error) {
    // Avoid leaking raw network URL errors
    if (
      error.message.includes('fetch') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('NetworkError')
    ) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
    }
    return error.message;
  }

  if (typeof error === 'string' && error.trim() !== '') {
    return error;
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === 'string' && errorObj.message.trim() !== '') {
      return errorObj.message;
    }
    if (typeof errorObj.error === 'string' && errorObj.error.trim() !== '') {
      return errorObj.error;
    }
  }

  return fallbackMessage;
}

/**
 * Shows an error toast notification with a clean, friendly message.
 */
export function notifyApiError(
  error: unknown,
  fallbackMessage = 'Thao tác không thành công. Vui lòng thử lại.',
): void {
  const message = getErrorMessage(error, fallbackMessage);
  toast.error(message, {
    duration: 4000,
  });
}

/**
 * Checks if the error was caused by a network connection failure.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.errorCode === 'NETWORK_ERROR' || error.status === 503;
  }
  return false;
}

/**
 * Checks if the error was caused by an unauthenticated / expired session (401).
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401;
  }
  return false;
}
