/**
 * @file anti-spoofing.util.ts
 * @description Validates driver GPS telemetry against physical limits to prevent GPS spoofing and teleportation.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

import { calculateHaversineDistance, isValidCoordinate } from '@/common/geo/haversine.util.js';

export interface GpsPingInput {
  lat: number;
  lng: number;
  timestamp?: number;
}

export interface AntiSpoofingResult {
  isValid: boolean;
  reason?: string;
  speedKmh?: number;
  distanceKm?: number;
}

export const MAX_REASONABLE_SPEED_KMH = 130; // Motorbike speed limit in urban environment

/**
 * Validates a GPS ping against physical sanity bounds and previous ping speed limits.
 */
export function validateGpsPing(
  current: GpsPingInput,
  previous?: GpsPingInput | null,
  maxSpeedKmh: number = MAX_REASONABLE_SPEED_KMH,
): AntiSpoofingResult {
  if (!isValidCoordinate(current.lat, current.lng)) {
    return {
      isValid: false,
      reason: `Tọa độ GPS không hợp lệ (lat: ${current.lat}, lng: ${current.lng}).`,
    };
  }

  if (!previous || !isValidCoordinate(previous.lat, previous.lng)) {
    return { isValid: true };
  }

  const distanceKm = calculateHaversineDistance(
    previous.lat,
    previous.lng,
    current.lat,
    current.lng,
  );

  // Nếu cự ly di chuyển dưới 50m (0.05 km), chấp thuận là GPS jitter hoặc ping liên tiếp không phải spoofing
  if (distanceKm < 0.05) {
    return {
      isValid: true,
      speedKmh: 0,
      distanceKm: Math.round(distanceKm * 1000) / 1000,
    };
  }

  const currentTs = current.timestamp ?? Date.now();
  const previousTs = previous.timestamp ?? (currentTs - 3000); // Default 3s if not provided

  const elapsedSeconds = Math.max((currentTs - previousTs) / 1000, 0.001);
  const speedKmh = (distanceKm / elapsedSeconds) * 3600;

  if (speedKmh > maxSpeedKmh) {
    return {
      isValid: false,
      reason: `Tốc độ di chuyển bất thường (${Math.round(speedKmh)} km/h vượt quá ngưỡng ${maxSpeedKmh} km/h). Nghi vấn GPS spoofing.`,
      speedKmh: Math.round(speedKmh * 10) / 10,
      distanceKm: Math.round(distanceKm * 1000) / 1000,
    };
  }

  return {
    isValid: true,
    speedKmh: Math.round(speedKmh * 10) / 10,
    distanceKm: Math.round(distanceKm * 1000) / 1000,
  };
}
