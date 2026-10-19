import { NextRequest, NextResponse } from 'next/server';

export interface StreetRouteStep {
  instruction: string;
  distance_meters: number;
  duration_seconds: number;
  type: string;
  modifier?: string;
  name: string;
  location: [number, number]; // [lat, lng]
}

export interface StreetRouteResponse {
  success: boolean;
  distance_km: number;
  duration_minutes: number;
  coordinates: [number, number][]; // [lat, lng][]
  steps: StreetRouteStep[];
  is_fallback: boolean;
}

interface CacheEntry {
  data: StreetRouteResponse;
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút
const routeCache = new Map<string, CacheEntry>();

/**
 * Tính khoảng cách Haversine chuẩn WGS84 (đơn vị: km)
 */
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

import { translateManeuver } from '@/features/orders/utils/geo-map.utils';
export { translateManeuver };

/**
 * Sinh dữ liệu dự phòng khi OSRM timeout hoặc gặp lỗi mạng
 */
function createFallbackRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): StreetRouteResponse {
  const distanceKm = calculateHaversineKm(startLat, startLng, endLat, endLng);
  const durationMinutes = Math.max(2, Math.ceil((distanceKm / 25) * 60)); // Giả định tốc độ 25km/h

  return {
    success: false,
    is_fallback: true,
    distance_km: distanceKm,
    duration_minutes: durationMinutes,
    coordinates: [
      [startLat, startLng],
      [endLat, endLng],
    ],
    steps: [
      {
        instruction: 'Bắt đầu lộ trình di chuyển',
        distance_meters: 0,
        duration_seconds: 0,
        type: 'depart',
        name: 'Điểm khởi hành',
        location: [startLat, startLng],
      },
      {
        instruction: `Di chuyển theo hướng điểm giao hàng (${distanceKm} km)`,
        distance_meters: Math.round(distanceKm * 1000),
        duration_seconds: durationMinutes * 60,
        type: 'continue',
        name: 'Đường đi',
        location: [startLat, startLng],
      },
      {
        instruction: 'Đến điểm giao hàng',
        distance_meters: 0,
        duration_seconds: 0,
        type: 'arrive',
        name: 'Điểm giao',
        location: [endLat, endLng],
      },
    ],
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const startLatStr = searchParams.get('startLat');
  const startLngStr = searchParams.get('startLng');
  const endLatStr = searchParams.get('endLat');
  const endLngStr = searchParams.get('endLng');

  if (!startLatStr || !startLngStr || !endLatStr || !endLngStr) {
    return NextResponse.json(
      { error: 'Thiếu tham số tọa độ (startLat, startLng, endLat, endLng).' },
      { status: 400 }
    );
  }

  const startLat = parseFloat(startLatStr);
  const startLng = parseFloat(startLngStr);
  const endLat = parseFloat(endLatStr);
  const endLng = parseFloat(endLngStr);

  if (
    isNaN(startLat) ||
    isNaN(startLng) ||
    isNaN(endLat) ||
    isNaN(endLng) ||
    startLat < -90 ||
    startLat > 90 ||
    endLat < -90 ||
    endLat > 90 ||
    startLng < -180 ||
    startLng > 180 ||
    endLng < -180 ||
    endLng > 180
  ) {
    return NextResponse.json(
      { error: 'Tọa độ GPS không hợp lệ. Vĩ độ phải nằm trong [-90, 90] và kinh độ [-180, 180].' },
      { status: 400 }
    );
  }

  // Tọa độ trùng nhau
  if (Math.abs(startLat - endLat) < 0.00001 && Math.abs(startLng - endLng) < 0.00001) {
    return NextResponse.json<StreetRouteResponse>({
      success: true,
      distance_km: 0,
      duration_minutes: 0,
      coordinates: [[startLat, startLng]],
      steps: [
        {
          instruction: 'Đã đến điểm giao hàng',
          distance_meters: 0,
          duration_seconds: 0,
          type: 'arrive',
          name: 'Điểm giao',
          location: [startLat, startLng],
        },
      ],
      is_fallback: false,
    });
  }

  // Kiểm tra In-Memory Cache
  const cacheKey = `${startLat.toFixed(4)},${startLng.toFixed(4)}->${endLat.toFixed(4)},${endLng.toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // Gọi OSRM với AbortController (timeout 5s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FoodDelivery-NextApp/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[RouteHandler] OSRM trả về mã lỗi ${response.status}. Chuyển sang fallback.`);
      const fallback = createFallbackRoute(startLat, startLng, endLat, endLng);
      return NextResponse.json(fallback);
    }

    interface OsrmManeuver {
      type: string;
      modifier?: string;
      location: [number, number]; // [lng, lat]
    }

    interface OsrmStep {
      distance: number;
      duration: number;
      name: string;
      maneuver: OsrmManeuver;
    }

    interface OsrmLeg {
      distance: number;
      duration: number;
      steps: OsrmStep[];
    }

    interface OsrmRoute {
      distance: number;
      duration: number;
      geometry: {
        coordinates: [number, number][]; // [lng, lat][]
      };
      legs: OsrmLeg[];
    }

    interface OsrmApiResponse {
      code: string;
      routes?: OsrmRoute[];
    }

    const data: OsrmApiResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.warn('[RouteHandler] Không tìm thấy tuyến đường OSRM hợp lệ. Dùng fallback.');
      const fallback = createFallbackRoute(startLat, startLng, endLat, endLng);
      return NextResponse.json(fallback);
    }

    const route = data.routes[0];
    // Chuyển đổi coordinates GeoJSON [lng, lat] sang Leaflet [lat, lng]
    const leafletCoords: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [
      lat,
      lng,
    ]);

    const steps: StreetRouteStep[] = [];
    if (route.legs && route.legs.length > 0) {
      for (const leg of route.legs) {
        if (leg.steps) {
          for (const step of leg.steps) {
            steps.push({
              instruction: translateManeuver(step.maneuver.type, step.maneuver.modifier, step.name),
              distance_meters: Math.round(step.distance),
              duration_seconds: Math.round(step.duration),
              type: step.maneuver.type,
              modifier: step.maneuver.modifier,
              name: step.name || '',
              location: [step.maneuver.location[1], step.maneuver.location[0]], // [lat, lng]
            });
          }
        }
      }
    }

    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));

    const result: StreetRouteResponse = {
      success: true,
      distance_km: distanceKm,
      duration_minutes: durationMinutes,
      coordinates: leafletCoords,
      steps,
      is_fallback: false,
    };

    // Lưu vào cache
    routeCache.set(cacheKey, { data: result, timestamp: Date.now() });

    // Dọn dẹp cache nếu kích thước vượt 200 bản ghi
    if (routeCache.size > 200) {
      const oldestKey = routeCache.keys().next().value;
      if (oldestKey) routeCache.delete(oldestKey);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn('[RouteHandler] Lỗi khi gọi OSRM API (timeout hoặc network error). Chuyển sang fallback.', err);
    const fallback = createFallbackRoute(startLat, startLng, endLat, endLng);
    return NextResponse.json(fallback);
  }
}
