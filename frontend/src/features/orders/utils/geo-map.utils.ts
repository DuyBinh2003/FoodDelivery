/**
 * Tiện ích bản đồ và tính toán cự ly địa lý cho Frontend (Geo Map Utils)
 */

/**
 * Tính khoảng cách đường chim bay giữa 2 tọa độ GPS (WGS84) theo công thức Haversine.
 * @returns Khoảng cách theo km làm tròn tới 1 chữ số thập phân (ví dụ: 2.4).
 */
export function calculateDistanceKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined,
): number {
  if (
    lat1 === null ||
    lat1 === undefined ||
    lon1 === null ||
    lon1 === undefined ||
    lat2 === null ||
    lat2 === undefined ||
    lon2 === null ||
    lon2 === undefined ||
    Number.isNaN(Number(lat1)) ||
    Number.isNaN(Number(lon1)) ||
    Number.isNaN(Number(lat2)) ||
    Number.isNaN(Number(lon2))
  ) {
    return 0;
  }

  const nLat1 = Number(lat1);
  const nLon1 = Number(lon1);
  const nLat2 = Number(lat2);
  const nLon2 = Number(lon2);

  // Nếu cùng 1 tọa độ thì khoảng cách bằng 0
  if (nLat1 === nLat2 && nLon1 === nLon2) {
    return 0;
  }

  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((nLat2 - nLat1) * Math.PI) / 180;
  const dLon = ((nLon2 - nLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((nLat1 * Math.PI) / 180) *
      Math.cos((nLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

/**
 * Tính thời gian giao hàng dự kiến (ETA) dựa trên cự ly (km) và tốc độ trung bình đô thị.
 */
export function calculateEtaMinutes(distanceKm: number, averageSpeedKmh: number = 25): number {
  if (!distanceKm || distanceKm <= 0) {
    return 1;
  }
  return Math.max(1, Math.round((distanceKm / averageSpeedKmh) * 60));
}

/**
 * Tính góc xoay (heading/bearing) từ điểm A đến điểm B theo độ (0 - 360).
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Sinh danh sách các điểm tọa độ nội suy dọc theo lộ trình để phục vụ mô phỏng di chuyển mượt mà.
 */
export function interpolateGpsRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  steps: number = 20,
): Array<{ lat: number; lng: number; step: number; percent: number }> {
  if (steps <= 0) return [{ lat: startLat, lng: startLng, step: 0, percent: 0 }];

  const waypoints: Array<{ lat: number; lng: number; step: number; percent: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lat = startLat + (endLat - startLat) * fraction;
    const lng = startLng + (endLng - startLng) * fraction;
    waypoints.push({
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      step: i,
      percent: Math.round(fraction * 100),
    });
  }
  return waypoints;
}
