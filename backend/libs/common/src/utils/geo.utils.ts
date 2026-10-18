/**
 * Tiện ích tính toán địa lý và khoảng cách (Geospatial Utilities)
 */

/**
 * Tính khoảng cách đường chim bay giữa 2 tọa độ GPS (WGS84) theo công thức Haversine.
 * @param lat1 Vĩ độ điểm thứ nhất (deg)
 * @param lon1 Kinh độ điểm thứ nhất (deg)
 * @param lat2 Vĩ độ điểm thứ hai (deg)
 * @param lon2 Kinh độ điểm thứ hai (deg)
 * @returns Khoảng cách theo km làm tròn tới 1 chữ số thập phân (ví dụ: 2.4). Trả về 0 nếu 2 điểm trùng nhau.
 */
export function calculateHaversineDistanceKm(
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
