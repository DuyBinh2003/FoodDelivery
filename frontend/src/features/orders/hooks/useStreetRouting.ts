'use client';

import { useState, useEffect, useRef } from 'react';
import {
  fetchStreetRoute,
  type StreetRouteResult,
} from '@/features/orders/utils/geo-map.utils';

interface UseStreetRoutingParams {
  startLat?: number | null;
  startLng?: number | null;
  endLat?: number | null;
  endLng?: number | null;
  enabled?: boolean;
}

export function useStreetRouting({
  startLat,
  startLng,
  endLat,
  endLng,
  enabled = true,
}: UseStreetRoutingParams) {
  const [route, setRoute] = useState<StreetRouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevCoordsKeyRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    if (
      startLat == null ||
      startLng == null ||
      endLat == null ||
      endLng == null ||
      Number.isNaN(Number(startLat)) ||
      Number.isNaN(Number(startLng)) ||
      Number.isNaN(Number(endLat)) ||
      Number.isNaN(Number(endLng))
    ) {
      return;
    }

    const sLat = Number(startLat);
    const sLng = Number(startLng);
    const eLat = Number(endLat);
    const eLng = Number(endLng);

    const coordsKey = `${sLat.toFixed(4)},${sLng.toFixed(4)}->${eLat.toFixed(4)},${eLng.toFixed(4)}`;
    if (coordsKey === prevCoordsKeyRef.current) {
      return;
    }
    prevCoordsKeyRef.current = coordsKey;

    let isCancelled = false;

    fetchStreetRoute(sLat, sLng, eLat, eLng)
      .then((result) => {
        if (!isCancelled) {
          setRoute(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const errMsg = err instanceof Error ? err.message : 'Lỗi khi tải tuyến đường OSRM';
          setError(errMsg);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [enabled, startLat, startLng, endLat, endLng]);

  return {
    route,
    isLoading,
    error,
  };
}
