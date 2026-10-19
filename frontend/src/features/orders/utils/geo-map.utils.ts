/**
 * Tiện ích bản đồ và tính toán cự ly địa lý cho Frontend (Geo Map Utils)
 */

export interface StreetRouteStep {
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  type: string;
  modifier?: string;
  name: string;
  location: [number, number]; // [lat, lng]
}

export interface StreetRouteResult {
  success: boolean;
  distance_km: number;
  duration_minutes: number;
  coordinates: [number, number][]; // [lat, lng][]
  steps: StreetRouteStep[];
  is_fallback: boolean;
}

/**
 * Chuyển đổi maneuver từ OSRM sang câu chỉ dẫn tiếng Việt tự nhiên
 */
export function translateManeuver(type: string, modifier?: string, name?: string): string {
  const roadName = name && name.trim() ? `vào đường ${name.trim()}` : '';
  const currentRoad = name && name.trim() ? `trên đường ${name.trim()}` : '';

  switch (type) {
    case 'depart':
      return currentRoad ? `Xuất phát ${currentRoad}` : 'Bắt đầu lộ trình di chuyển';
    case 'arrive':
      return 'Đến điểm giao hàng';
    case 'turn': {
      switch (modifier) {
        case 'left':
          return `Rẽ trái ${roadName || 'vào đường tiếp theo'}`.trim();
        case 'slight left':
          return `Chếch sang trái ${roadName || 'vào đường tiếp theo'}`.trim();
        case 'sharp left':
          return `Rẽ ngoặt sang trái ${roadName || 'vào đường tiếp theo'}`.trim();
        case 'right':
          return `Rẽ phải ${roadName || 'vào đường tiếp theo'}`.trim();
        case 'slight right':
          return `Chếch sang phải ${roadName || 'vào đường tiếp theo'}`.trim();
        case 'sharp right':
          return `Rẽ ngoặt sang phải ${roadName || 'vào đường tiếp theo'}`.trim();
        case 'straight':
          return `Đi thẳng ${roadName || currentRoad}`.trim();
        case 'uturn':
          return 'Quay đầu xe';
        default:
          return `Rẽ ${roadName || 'vào ngã rẽ tiếp theo'}`.trim();
      }
    }
    case 'continue':
      return `Tiếp tục đi thẳng ${currentRoad || roadName}`.trim();
    case 'new name':
      return `Đi tiếp ${roadName || currentRoad}`.trim();
    case 'roundabout':
    case 'rotary':
      return `Vào vòng xuyến, đi theo lối ra ${roadName}`.trim();
    case 'fork':
      return modifier?.includes('left')
        ? `Tách làn sang nhánh trái ${roadName}`.trim()
        : `Tách làn sang nhánh phải ${roadName}`.trim();
    case 'end of road':
      return modifier?.includes('left')
        ? `Đến cuối đường, rẽ trái ${roadName}`.trim()
        : `Đến cuối đường, rẽ phải ${roadName}`.trim();
    default:
      return `Tiếp tục di chuyển ${currentRoad || roadName}`.trim();
  }
}

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
 * Sinh danh sách các điểm tọa độ nội suy dọc theo lộ trình đường thẳng để phục vụ mô phỏng di chuyển mượt mà.
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

/**
 * Gọi API Route Handler /api/routing để lấy tuyến đường OSRM thực tế
 */
export async function fetchStreetRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): Promise<StreetRouteResult> {
  const params = new URLSearchParams({
    startLat: startLat.toString(),
    startLng: startLng.toString(),
    endLat: endLat.toString(),
    endLng: endLng.toString(),
  });

  try {
    const response = await fetch(`/api/routing?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Routing request failed with status ${response.status}`);
    }
    const data: StreetRouteResult = await response.json();
    return data;
  } catch (error) {
    console.warn('[fetchStreetRoute] Không thể tải lộ trình đường phố OSRM, kích hoạt fallback:', error);
    const fallbackDistance = calculateDistanceKm(startLat, startLng, endLat, endLng);
    return {
      success: false,
      is_fallback: true,
      distance_km: fallbackDistance,
      duration_minutes: calculateEtaMinutes(fallbackDistance),
      coordinates: [
        [startLat, startLng],
        [endLat, endLng],
      ],
      steps: [
        {
          instruction: 'Bắt đầu di chuyển từ nhà hàng',
          distance_meters: 0,
          duration_seconds: 0,
          type: 'depart',
          name: 'Điểm khởi hành',
          location: [startLat, startLng],
        },
        {
          instruction: `Đi thẳng đến địa chỉ khách hàng (${fallbackDistance} km)`,
          distance_meters: Math.round(fallbackDistance * 1000),
          duration_seconds: calculateEtaMinutes(fallbackDistance) * 60,
          type: 'continue',
          name: 'Đường đi',
          location: [startLat, startLng],
        },
        {
          instruction: 'Đã đến địa chỉ giao hàng',
          distance_meters: 0,
          duration_seconds: 0,
          type: 'arrive',
          name: 'Điểm giao',
          location: [endLat, endLng],
        },
      ],
    };
  }
}

/**
 * Tìm bước rẽ (maneuver step) hiện tại hoặc kế tiếp dựa trên vị trí hiện thời của xe
 */
export function findCurrentStep(
  currentLat: number,
  currentLng: number,
  steps: StreetRouteStep[],
): { currentStep: StreetRouteStep | null; nextStep: StreetRouteStep | null; stepIndex: number } {
  if (!steps || steps.length === 0) {
    return { currentStep: null, nextStep: null, stepIndex: -1 };
  }

  if (steps.length === 1) {
    return { currentStep: steps[0], nextStep: null, stepIndex: 0 };
  }

  // Tìm step gần nhất với vị trí hiện tại
  let minDistance = Infinity;
  let closestIndex = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const dist = calculateDistanceKm(currentLat, currentLng, step.location[0], step.location[1]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  // Nếu vị trí xe đã vượt qua hoặc gần sát step này (< 30m) và có step tiếp theo, hướng tới step tiếp theo
  const currentStep = steps[closestIndex] || steps[0];
  const nextStep = closestIndex + 1 < steps.length ? steps[closestIndex + 1] : null;

  return {
    currentStep,
    nextStep,
    stepIndex: closestIndex,
  };
}

/**
 * Sinh danh sách các điểm mô phỏng bám sát đường phố từ chuỗi tọa độ OSRM
 */
export function buildStreetSimulationWaypoints(
  coordinates: [number, number][],
): Array<{ lat: number; lng: number; heading: number; percent: number }> {
  if (!coordinates || coordinates.length === 0) return [];
  if (coordinates.length === 1) {
    return [{ lat: coordinates[0][0], lng: coordinates[0][1], heading: 0, percent: 100 }];
  }

  // Tính tổng số đoạn và nội suy các đoạn dài để xe chạy đều
  const points: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [lat1, lng1] = coordinates[i];
    const [lat2, lng2] = coordinates[i + 1];
    const segmentDist = calculateDistanceKm(lat1, lng1, lat2, lng2);

    // Nếu khoảng cách giữa 2 nút OSRM lớn hơn 50m, chia nhỏ đoạn đó ra
    const subSteps = Math.max(1, Math.round(segmentDist * 20)); // Cứ 50m chia 1 điểm
    for (let s = 0; s < subSteps; s++) {
      const frac = s / subSteps;
      points.push({
        lat: Number((lat1 + (lat2 - lat1) * frac).toFixed(6)),
        lng: Number((lng1 + (lng2 - lng1) * frac).toFixed(6)),
      });
    }
  }

  // Thêm điểm cuối cùng
  const lastCoord = coordinates[coordinates.length - 1];
  points.push({ lat: lastCoord[0], lng: lastCoord[1] });

  // Đảm bảo đủ số điểm minPoints nếu lộ trình quá ngắn
  const result: Array<{ lat: number; lng: number; heading: number; percent: number }> = [];
  const total = points.length;

  for (let i = 0; i < total; i++) {
    const current = points[i];
    const next = i + 1 < total ? points[i + 1] : points[i];
    const heading = calculateBearing(current.lat, current.lng, next.lat, next.lng);
    const percent = Math.round((i / Math.max(1, total - 1)) * 100);

    result.push({
      lat: current.lat,
      lng: current.lng,
      heading,
      percent,
    });
  }

  return result;
}
