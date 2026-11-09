/**
 * @file bearing.util.ts
 * @description Calculates the initial bearing (azimuth angle) from point A to point B in degrees (0 - 360).
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

import { isValidCoordinate } from '@/common/geo/haversine.util.js';

/**
 * Calculates initial bearing in degrees from point 1 to point 2.
 * 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    throw new Error('Coordinates must be valid numbers within latitude [-90, 90] and longitude [-180, 180].');
  }

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(rLat2);
  const x =
    Math.cos(rLat1) * Math.sin(rLat2) -
    Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);

  const initialBearingRadians = Math.atan2(y, x);
  const initialBearingDegrees = (initialBearingRadians * 180) / Math.PI;

  // Normalize to 0° - 360°
  return (initialBearingDegrees + 360) % 360;
}
