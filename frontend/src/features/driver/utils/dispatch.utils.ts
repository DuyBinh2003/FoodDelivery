/**
 * @file dispatch.utils.ts
 * @description Pure utility functions for Driver Dispatch offer calculations, validation, countdown timers, and formatting.
 */

import type { TripOfferData } from '../components/driver-dashboard/incoming-trip-modal';

/**
 * Kiếm tra tính hợp lệ của gói dữ liệu TripOffer nhận từ Gateway/Dispatch Service.
 */
export function validateTripOffer(offer: unknown): offer is TripOfferData {
  if (!offer || typeof offer !== 'object') return false;

  const data = offer as Partial<TripOfferData>;

  if (typeof data.orderId !== 'string' || !data.orderId.trim()) return false;
  if (typeof data.restaurantName !== 'string' || !data.restaurantName.trim()) return false;
  if (typeof data.deliveryAddress !== 'string' || !data.deliveryAddress.trim()) return false;

  if (typeof data.restaurantLat !== 'number' || isNaN(data.restaurantLat)) return false;
  if (typeof data.restaurantLng !== 'number' || isNaN(data.restaurantLng)) return false;
  if (typeof data.deliveryLat !== 'number' || isNaN(data.deliveryLat)) return false;
  if (typeof data.deliveryLng !== 'number' || isNaN(data.deliveryLng)) return false;

  if (typeof data.driverEarnings !== 'number' || data.driverEarnings < 0 || isNaN(data.driverEarnings)) return false;
  if (typeof data.distanceKm !== 'number' || data.distanceKm < 0 || isNaN(data.distanceKm)) return false;

  return true;
}

/**
 * Tính số giây còn lại và % thanh tiến trình đếm ngược 15s.
 */
export function calculateRemainingCountdown(
  expiresAt: number,
  timeoutSeconds = 15,
  currentTime = Date.now(),
): { secondsLeft: number; percent: number; isExpired: boolean } {
  if (isNaN(expiresAt) || expiresAt <= 0) {
    return { secondsLeft: 0, percent: 0, isExpired: true };
  }

  const msLeft = expiresAt - currentTime;
  if (msLeft <= 0) {
    return { secondsLeft: 0, percent: 0, isExpired: true };
  }

  const secondsLeft = Math.min(timeoutSeconds, Math.ceil(msLeft / 1000));
  const percent = Math.max(0, Math.min(100, Math.round((secondsLeft / timeoutSeconds) * 100)));

  return {
    secondsLeft,
    percent,
    isExpired: false,
  };
}

/**
 * Xác định dải màu hiển thị theo thời gian còn lại (xanh -> cam -> đỏ chớp).
 */
export function getCountdownColor(secondsLeft: number): 'green' | 'amber' | 'red' {
  if (secondsLeft > 8) return 'green';
  if (secondsLeft > 4) return 'amber';
  return 'red';
}

/**
 * Định dạng tiền tệ thu nhập tài xế theo chuẩn VND.
 */
export function formatDriverEarnings(amount: number): string {
  if (isNaN(amount) || amount < 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Định dạng khoảng cách giao hàng sang định dạng km hoặc m dễ nhìn.
 */
export function formatTripDistance(distanceKm: number): string {
  if (isNaN(distanceKm) || distanceKm <= 0) return '0 m';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
