'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity } from 'lucide-react';
import {
  buildStreetSimulationWaypoints,
  findCurrentStep,
  type StreetRouteStep,
} from '@/features/orders/utils/geo-map.utils';

interface DriverGpsSimulatorProps {
  orderId: string;
  driverId?: string;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  streetCoordinates?: [number, number][];
  steps?: StreetRouteStep[];
  onSendLocationUpdate: (coords: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    driverId?: string;
  }) => void;
  onCurrentStepChange?: (step: StreetRouteStep | null, nextStep: StreetRouteStep | null) => void;
}

export function DriverGpsSimulator({
  orderId,
  driverId = 'simulated-driver',
  restaurantLat,
  restaurantLng,
  deliveryLat,
  deliveryLng,
  streetCoordinates,
  steps,
  onSendLocationUpdate,
  onCurrentStepChange,
}: DriverGpsSimulatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startLat = restaurantLat != null ? Number(restaurantLat) : 10.772545;
  const startLng = restaurantLng != null ? Number(restaurantLng) : 106.702758;
  const endLat = deliveryLat != null ? Number(deliveryLat) : 10.77653;
  const endLng = deliveryLng != null ? Number(deliveryLng) : 106.70098;

  // Build waypoints from street coordinates or fallback to straight line
  const waypoints = useMemo(() => {
    if (streetCoordinates && streetCoordinates.length >= 2) {
      return buildStreetSimulationWaypoints(streetCoordinates);
    }
    // Fallback: linear waypoints
    const fallbackCoords: [number, number][] = [
      [startLat, startLng],
      [endLat, endLng],
    ];
    return buildStreetSimulationWaypoints(fallbackCoords);
  }, [streetCoordinates, startLat, startLng, endLat, endLng]);

  const currentIndexRef = useRef(0);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (waypoints.length === 0) return;

    // Tần suất cập nhật (ms): 400ms ở 1x, 200ms ở 2x, 100ms ở 5x
    const intervalMs = Math.max(100, Math.round(400 / speedMultiplier));

    timerRef.current = setInterval(() => {
      const totalPoints = waypoints.length;
      const nextIndex = currentIndexRef.current + 1;

      if (nextIndex >= totalPoints) {
        setIsRunning(false);
        currentIndexRef.current = totalPoints - 1;
        const lastPoint = waypoints[totalPoints - 1];

        setProgress(100);
        onSendLocationUpdate({
          lat: lastPoint.lat,
          lng: lastPoint.lng,
          heading: lastPoint.heading,
          speed: 0,
          driverId,
        });

        if (steps && steps.length > 0 && onCurrentStepChange) {
          const finalStep = steps[steps.length - 1];
          onCurrentStepChange(finalStep, null);
        }
        return;
      }

      currentIndexRef.current = nextIndex;
      const currentPoint = waypoints[nextIndex];
      setProgress(currentPoint.percent);

      onSendLocationUpdate({
        lat: currentPoint.lat,
        lng: currentPoint.lng,
        heading: currentPoint.heading,
        speed: 30 * speedMultiplier,
        driverId,
      });

      // Cập nhật bước rẽ Turn-by-Turn nếu có
      if (steps && steps.length > 0 && onCurrentStepChange) {
        const { currentStep, nextStep } = findCurrentStep(
          currentPoint.lat,
          currentPoint.lng,
          steps,
        );
        onCurrentStepChange(currentStep, nextStep);
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    isRunning,
    speedMultiplier,
    waypoints,
    steps,
    driverId,
    onSendLocationUpdate,
    onCurrentStepChange,
  ]);

  const handleReset = () => {
    setIsRunning(false);
    currentIndexRef.current = 0;
    setProgress(0);

    const firstPoint = waypoints[0] || {
      lat: startLat,
      lng: startLng,
      heading: 0,
      percent: 0,
    };

    onSendLocationUpdate({
      lat: firstPoint.lat,
      lng: firstPoint.lng,
      heading: firstPoint.heading,
      speed: 0,
      driverId,
    });

    if (steps && steps.length > 0 && onCurrentStepChange) {
      onCurrentStepChange(steps[0], steps.length > 1 ? steps[1] : null);
    }
  };

  const isStreetMode = Boolean(streetCoordinates && streetCoordinates.length >= 2);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-3.5 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
          <span>Mô phỏng GPS di chuyển (Đơn #{orderId.slice(0, 8)})</span>
          {isStreetMode && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              OSRM Phố
            </span>
          )}
        </button>

        <span className="text-[11px] font-mono text-zinc-400">
          {progress > 0 && progress < 100
            ? `Đang chạy: ${progress}%`
            : progress === 100
            ? 'Đã đến đích'
            : 'Sẵn sàng'}
        </span>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-cyan-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Tạm dừng</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Bắt đầu chạy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                title="Khởi động lại từ Quán ăn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Speed multipliers */}
            <div className="flex items-center gap-1">
              <FastForward className="w-3 h-3 text-zinc-500 mr-1" />
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeedMultiplier(s)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    speedMultiplier === s
                      ? 'bg-orange-500 text-white font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
