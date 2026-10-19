'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TripOfferData } from '@/features/driver/components/driver-dashboard/incoming-trip-modal';

interface UseDriverDispatchParams {
  driverId?: string;
  isOnline: boolean;
  currentLat?: number | null;
  currentLng?: number | null;
  onTripAccepted?: (orderId: string) => void;
}

export function useDriverDispatch({
  driverId,
  isOnline,
  currentLat,
  currentLng,
  onTripAccepted,
}: UseDriverDispatchParams) {
  const [incomingOffer, setIncomingOffer] = useState<TripOfferData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const wsUrl =
    process.env.NEXT_PUBLIC_DELIVERY_WS_URL || 'http://localhost:3005/delivery';

  // 1. Quản lý kết nối Socket.IO
  useEffect(() => {
    if (!driverId || !isOnline) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join vào room cá nhân của tài xế
      socket.emit('driver:join', { driverId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Lắng nghe cuốc xe bắn tới từ Server
    socket.on('driver:trip_offer', (offer: TripOfferData) => {
      setIncomingOffer(offer);
    });

    // Lắng nghe khi cuốc xe bị thu hồi / chuyển người khác
    socket.on('driver:trip_cancelled', (data: { orderId: string }) => {
      setIncomingOffer((prev) => (prev?.orderId === data.orderId ? null : prev));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIncomingOffer(null);
    };
  }, [driverId, isOnline, wsUrl]);

  // 2. Định kỳ đồng bộ vị trí GPS vào Redis Geo khi đang ONLINE
  useEffect(() => {
    if (!isOnline || !driverId) {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      return;
    }

    const lat = currentLat != null ? Number(currentLat) : 10.772545;
    const lng = currentLng != null ? Number(currentLng) : 106.702758;

    const syncLocation = async () => {
      try {
        const deliveryApiUrl = process.env.NEXT_PUBLIC_DELIVERY_API_URL || 'http://localhost:3005';
        await fetch(`${deliveryApiUrl}/delivery/driver/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_id: driverId,
            lat,
            lng,
          }),
        }).catch(() => {
          // Bỏ qua lỗi kết nối tạm thời
        });
      } catch {
        // Continue
      }
    };

    // Chạy ngay lần đầu
    syncLocation();
    pingIntervalRef.current = setInterval(syncLocation, 10000); // Mỗi 10 giây

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [isOnline, driverId, currentLat, currentLng]);

  // 3. Chấp nhận cuốc
  const acceptTrip = useCallback(
    async (orderId: string): Promise<boolean> => {
      if (!driverId) return false;

      return new Promise<boolean>((resolve) => {
        if (socketRef.current?.connected) {
          socketRef.current.emit(
            'driver:accept_trip',
            { orderId, driverId },
            (response: { success?: boolean; error?: string }) => {
              if (response && response.success) {
                setIncomingOffer(null);
                if (onTripAccepted) onTripAccepted(orderId);
                resolve(true);
              } else {
                resolve(false);
              }
            },
          );
        } else {
          // Fallback REST call
          const deliveryApiUrl = process.env.NEXT_PUBLIC_DELIVERY_API_URL || 'http://localhost:3005';
          fetch(`${deliveryApiUrl}/delivery/orders/${orderId}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driver_id: driverId }),
          })
            .then((res) => {
              if (res.ok) {
                setIncomingOffer(null);
                if (onTripAccepted) onTripAccepted(orderId);
                resolve(true);
              } else {
                resolve(false);
              }
            })
            .catch(() => resolve(false));
        }
      });
    },
    [driverId, onTripAccepted],
  );

  // 4. Từ chối cuốc
  const rejectTrip = useCallback(
    async (orderId: string, reason?: string): Promise<boolean> => {
      if (!driverId) return false;

      setIncomingOffer(null);

      if (socketRef.current?.connected) {
        socketRef.current.emit('driver:reject_trip', { orderId, driverId, reason });
        return true;
      }

      const deliveryApiUrl = process.env.NEXT_PUBLIC_DELIVERY_API_URL || 'http://localhost:3005';
      await fetch(`${deliveryApiUrl}/delivery/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_id: driverId, reason }),
      }).catch(() => {
        // Ignore
      });

      return true;
    },
    [driverId],
  );

  const handleTimeout = useCallback(
    (orderId: string) => {
      rejectTrip(orderId, 'Hết 15 giây đếm ngược');
    },
    [rejectTrip],
  );

  const effectiveConnected = isOnline && !!driverId ? isConnected : false;
  const effectiveOffer = isOnline && !!driverId ? incomingOffer : null;

  return {
    incomingOffer: effectiveOffer,
    isConnected: effectiveConnected,
    acceptTrip,
    rejectTrip,
    handleTimeout,
  };
}
