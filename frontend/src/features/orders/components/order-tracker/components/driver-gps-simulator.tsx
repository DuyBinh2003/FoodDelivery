'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity } from 'lucide-react';

interface DriverGpsSimulatorProps {
  orderId: string;
  driverId?: string;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  onSendLocationUpdate: (coords: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    driverId?: string;
  }) => void;
}

export function DriverGpsSimulator({
  orderId,
  driverId = 'simulated-driver',
  restaurantLat,
  restaurantLng,
  deliveryLat,
  deliveryLng,
  onSendLocationUpdate,
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

  // Calculate heading between two points in degrees
  const calculateHeading = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
    const x =
      Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
      Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  };

  const currentHeading = calculateHeading(startLat, startLng, endLat, endLng);

  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalMs = Math.max(200, 1000 / speedMultiplier);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          setIsRunning(false);
          // Send final destination location
          onSendLocationUpdate({
            lat: endLat,
            lng: endLng,
            heading: currentHeading,
            speed: 0,
            driverId,
          });
          return 100;
        }

        // Linear interpolation with slight jitter for realism
        const fraction = next / 100;
        const lat = startLat + (endLat - startLat) * fraction;
        const lng = startLng + (endLng - startLng) * fraction;

        onSendLocationUpdate({
          lat,
          lng,
          heading: currentHeading,
          speed: 30 * speedMultiplier,
          driverId,
        });

        return next;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    isRunning,
    speedMultiplier,
    startLat,
    startLng,
    endLat,
    endLng,
    currentHeading,
    driverId,
    onSendLocationUpdate,
  ]);

  const handleReset = () => {
    setIsRunning(false);
    setProgress(0);
    onSendLocationUpdate({
      lat: startLat,
      lng: startLng,
      heading: currentHeading,
      speed: 0,
      driverId,
    });
  };

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
              className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-300"
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
