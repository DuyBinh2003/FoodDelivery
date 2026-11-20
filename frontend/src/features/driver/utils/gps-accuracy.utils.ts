/**
 * @file gps-accuracy.utils.ts
 * @description Utilities to evaluate GPS signal accuracy and format driver status badges.
 * @traceability docs/plans/platform/realtime-geospatial-ingestion-and-driver-dispatch.md (Issue #83)
 */

export type GpsAccuracyLevel = 'EXCELLENT' | 'MODERATE' | 'POOR' | 'UNAVAILABLE';

export interface GpsAccuracyBadgeConfig {
  level: GpsAccuracyLevel;
  label: string;
  colorClass: string;
  dotColorClass: string;
  description: string;
  isReliable: boolean;
}

/**
 * Determines GPS accuracy level based on horizontal accuracy in meters.
 * Thresholds:
 * - < 15m: EXCELLENT (Green)
 * - 15m - 50m: MODERATE (Yellow)
 * - > 50m: POOR (Red)
 * - null/undefined/NaN/<=0: UNAVAILABLE (Gray/Red)
 */
export function getGpsAccuracyLevel(accuracyMeters?: number | null): GpsAccuracyLevel {
  if (
    accuracyMeters === null ||
    accuracyMeters === undefined ||
    isNaN(accuracyMeters) ||
    accuracyMeters <= 0
  ) {
    return 'UNAVAILABLE';
  }

  if (accuracyMeters < 15) {
    return 'EXCELLENT';
  }

  if (accuracyMeters <= 50) {
    return 'MODERATE';
  }

  return 'POOR';
}

/**
 * Returns UI display configuration for a given GPS accuracy level.
 */
export function getGpsAccuracyBadgeConfig(level: GpsAccuracyLevel): GpsAccuracyBadgeConfig {
  switch (level) {
    case 'EXCELLENT':
      return {
        level,
        label: 'GPS Mạnh (<15m)',
        colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        dotColorClass: 'bg-emerald-500 animate-pulse',
        description: 'Tín hiệu GPS rất tốt, định vị chuẩn xác từng mét.',
        isReliable: true,
      };
    case 'MODERATE':
      return {
        level,
        label: 'GPS Trung bình (15-50m)',
        colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        dotColorClass: 'bg-amber-500',
        description: 'Tín hiệu vừa phải, có thể bị ảnh hưởng bởi nhà cao tầng.',
        isReliable: true,
      };
    case 'POOR':
      return {
        level,
        label: 'GPS Yếu (>50m)',
        colorClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
        dotColorClass: 'bg-rose-500',
        description: 'Độ chính xác thấp, vui lòng di chuyển ra nơi thông thoáng.',
        isReliable: false,
      };
    case 'UNAVAILABLE':
    default:
      return {
        level: 'UNAVAILABLE',
        label: 'Mất tín hiệu GPS',
        colorClass: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20',
        dotColorClass: 'bg-neutral-500',
        description: 'Chưa cấp quyền truy cập vị trí hoặc thiết bị mất sóng GPS.',
        isReliable: false,
      };
  }
}

