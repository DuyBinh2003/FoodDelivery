/**
 * @file haversine.util.ts
 * @description Computes great-circle distance between two GPS coordinates using the Haversine formula.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Validates whether latitude and longitude are within standard WGS84 bounds.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculates the Haversine distance in kilometers between two GPS coordinates.
 * @throws Error if any coordinate is outside standard bounds.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  if (!isValidCoordinate(lat1, lon1)) {
    throw new Error(`Invalid coordinate (lat1: ${lat1}, lon1: ${lon1}). Latitude must be [-90, 90] and longitude [-180, 180].`);
  }
  if (!isValidCoordinate(lat2, lon2)) {
    throw new Error(`Invalid coordinate (lat2: ${lat2}, lon2: ${lon2}). Latitude must be [-90, 90] and longitude [-180, 180].`);
  }

  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  // Round to 3 decimal places (1 meter precision)
  return Math.round(distance * 1000) / 1000;
}
