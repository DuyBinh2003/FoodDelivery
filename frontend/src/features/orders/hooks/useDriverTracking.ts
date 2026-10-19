'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getRequiredEnv } from '@/lib/env';
import type { DriverLocationUpdate } from '@/features/orders/types';

interface UseDriverTrackingProps {
  orderId: string;
  enabled?: boolean;
  dropoffCoords?: { lat: number; lng: number } | null;
}

export function useDriverTracking({
  orderId,
  enabled = true,
  dropoffCoords,
}: UseDriverTrackingProps) {
  const [driverLocation, setDriverLocation] = useState<DriverLocationUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!orderId || !enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    let wsUrl: string;
    try {
      wsUrl = getRequiredEnv('NEXT_PUBLIC_DELIVERY_WS_URL');
    } catch (err) {
      console.warn('[useDriverTracking] Could not get delivery WS URL:', err);
      return;
    }

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('order:track', { orderId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('driver:location_current', (location: DriverLocationUpdate) => {
      if (location && location.lat != null && location.lng != null) {
        setDriverLocation(location);
      }
    });

    socket.on('driver:location_updated', (location: DriverLocationUpdate) => {
      if (location && location.lat != null && location.lng != null) {
        setDriverLocation(location);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [orderId, enabled]);

  // Method to send location update to server (used by driver simulator or driver client)
  const sendLocationUpdate = useCallback(
    (coords: { lat: number; lng: number; heading?: number; speed?: number; driverId?: string }) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return;
      }

      socketRef.current.emit('driver:update_location', {
        orderId,
        driverId: coords.driverId || 'simulated-driver',
        lat: coords.lat,
        lng: coords.lng,
        heading: coords.heading,
        speed: coords.speed || 30,
        dropoff_lat: dropoffCoords?.lat,
        dropoff_lng: dropoffCoords?.lng,
      });
    },
    [orderId, dropoffCoords],
  );

  return {
    driverLocation,
    isConnected,
    sendLocationUpdate,
  };
}
