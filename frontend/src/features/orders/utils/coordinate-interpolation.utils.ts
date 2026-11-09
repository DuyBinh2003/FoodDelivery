/**
 * @file coordinate-interpolation.utils.ts
 * @description Coordinate interpolation and bearing calculation for smooth driver marker tracking on maps.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

export type CoordinatePair = [number, number]; // [lat, lng]

/**
 * Linearly interpolates between two GPS coordinate pairs based on fraction [0.0, 1.0].
 * Clamps fraction between 0 and 1.
 */
export function interpolateCoordinate(
  start: CoordinatePair,
  end: CoordinatePair,
  fraction: number,
): CoordinatePair {
  const clampedFraction = Math.max(0, Math.min(1, fraction));
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  const lat = lat1 + (lat2 - lat1) * clampedFraction;
  const lng = lng1 + (lng2 - lng1) * clampedFraction;

  return [Math.round(lat * 1000000) / 1000000, Math.round(lng * 1000000) / 1000000];
}

/**
 * Calculates initial heading angle (bearing) in degrees [0, 360) between start and end coordinates.
 * 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function calculateHeadingAngle(start: CoordinatePair, end: CoordinatePair): number {
  const [lat1, lon1] = start;
  const [lat2, lon2] = end;

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

  return Math.round(((initialBearingDegrees + 360) % 360) * 10) / 10;
}

/**
 * Calculates dynamic ETA in minutes based on remaining distance in kilometers and average speed in km/h.
 * Returns 0 if remainingDistance <= 0. Minimum 1 minute if distance > 0.
 */
export function calculateDynamicEta(
  remainingDistanceKm: number,
  averageSpeedKmh: number = 25, // Average urban motorbike speed in Vietnam
): number {
  if (remainingDistanceKm <= 0) {
    return 0;
  }

  const speed = Math.max(averageSpeedKmh, 5); // Avoid division by zero, floor speed at 5 km/h
  const hours = remainingDistanceKm / speed;
  const minutes = Math.round(hours * 60);

  return Math.max(1, minutes);
}
