'use client';

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import type {
  Map as LeafletMap,
  Marker as LeafletMarker,
  Polyline as LeafletPolyline,
} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Store,
  Home,
  LocateFixed,
  Maximize2,
  Clock,
  CornerUpLeft,
  CornerUpRight,
  ArrowUpLeft,
  ArrowUpRight,
  Undo2,
  Navigation,
  Flag,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Route,
} from 'lucide-react';
import type { DriverLocationUpdate, OrderStatus } from '@/features/orders/types';
import type { StreetRouteStep } from '@/features/orders/utils/geo-map.utils';

interface OrderTrackingMapProps {
  status: OrderStatus;
  restaurantName: string;
  restaurantAddress?: string;
  restaurantLat?: number | null;
  restaurantLng?: number | null;
  deliveryAddress: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  totalDistanceKm?: number | null;
  driverName?: string;
  driverLocation?: DriverLocationUpdate | null;
  isLiveConnected?: boolean;
  streetCoordinates?: [number, number][];
  steps?: StreetRouteStep[];
  currentStep?: StreetRouteStep | null;
  nextStep?: StreetRouteStep | null;
  routeDistanceKm?: number | null;
  routeDurationMinutes?: number | null;
  isRoutingFallback?: boolean;
}

export function OrderTrackingMap({
  status,
  restaurantName,
  restaurantAddress,
  restaurantLat,
  restaurantLng,
  deliveryAddress,
  deliveryLat,
  deliveryLng,
  totalDistanceKm,
  driverName,
  driverLocation,
  isLiveConnected = false,
  streetCoordinates,
  steps,
  currentStep,
  nextStep,
  routeDistanceKm,
  routeDurationMinutes,
  isRoutingFallback = false,
}: OrderTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const restMarkerRef = useRef<LeafletMarker | null>(null);
  const dropoffMarkerRef = useRef<LeafletMarker | null>(null);
  const driverMarkerRef = useRef<LeafletMarker | null>(null);
  const polylineGlowRef = useRef<LeafletPolyline | null>(null);
  const polylineRef = useRef<LeafletPolyline | null>(null);

  const [isBannerCollapsed, setIsBannerCollapsed] = useState(false);

  const infoRef = useRef({
    restaurantName,
    restaurantAddress,
    deliveryAddress,
    driverName,
  });

  useEffect(() => {
    infoRef.current = {
      restaurantName,
      restaurantAddress,
      deliveryAddress,
      driverName,
    };
  });

  // Default coordinates (TP.HCM District 1) if coordinates are not provided
  const restCoords = useMemo<[number, number]>(
    () => [
      restaurantLat != null ? Number(restaurantLat) : 10.772545,
      restaurantLng != null ? Number(restaurantLng) : 106.702758,
    ],
    [restaurantLat, restaurantLng],
  );

  const dropoffCoords = useMemo<[number, number]>(
    () => [
      deliveryLat != null ? Number(deliveryLat) : 10.77653,
      deliveryLng != null ? Number(deliveryLng) : 106.70098,
    ],
    [deliveryLat, deliveryLng],
  );

  // Effective driver coordinates
  const currentDriverCoords = useMemo<[number, number] | null>(() => {
    if (driverLocation) {
      return [driverLocation.lat, driverLocation.lng];
    }
    if (status === 'DELIVERING') {
      return [
        (restCoords[0] + dropoffCoords[0]) / 2 + 0.001,
        (restCoords[1] + dropoffCoords[1]) / 2 + 0.001,
      ];
    }
    return null;
  }, [driverLocation, status, restCoords, dropoffCoords]);

  // Derived display distance and ETA
  const activeDistance = routeDistanceKm ?? driverLocation?.remaining_km ?? totalDistanceKm ?? null;
  const etaText = routeDurationMinutes != null
    ? `${routeDurationMinutes} phút`
    : driverLocation?.eta_minutes != null
    ? `${driverLocation.eta_minutes} phút`
    : '~10 - 15 phút';

  // Fit bounds to show all markers & route
  const fitAllBounds = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const points: [number, number][] =
      streetCoordinates && streetCoordinates.length >= 2
        ? streetCoordinates
        : [restCoords, dropoffCoords];

    if (currentDriverCoords) {
      points.push(currentDriverCoords);
    }
    mapInstanceRef.current.fitBounds(points, {
      padding: [45, 45],
      maxZoom: 16,
      animate: true,
    });
  }, [restCoords, dropoffCoords, currentDriverCoords, streetCoordinates]);

  // Focus on Driver marker
  const focusOnDriver = useCallback(() => {
    if (!mapInstanceRef.current) return;
    if (currentDriverCoords) {
      mapInstanceRef.current.setView(currentDriverCoords, 16, { animate: true });
    } else {
      fitAllBounds();
    }
  }, [currentDriverCoords, fitAllBounds]);

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: restCoords,
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        className: 'map-tiles-filter',
      }).addTo(map);

      // Custom Restaurant Marker Icon
      const restaurantIcon = L.divIcon({
        className: 'custom-restaurant-pin',
        html: `
          <div style="
            position: relative;
            transform: translate(-50%, -100%);
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <div style="
              width: 38px;
              height: 38px;
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
              border-radius: 12px;
              border: 2px solid #ffffff;
              box-shadow: 0 4px 15px rgba(249, 115, 22, 0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                <path d="M2 7h20"/>
              </svg>
            </div>
            <div style="
              width: 8px;
              height: 8px;
              background: #ea580c;
              transform: rotate(45deg);
              margin-top: -4px;
              border: 1px solid white;
            "></div>
          </div>
        `,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
      });

      // Custom Dropoff (Customer) Marker Icon
      const dropoffIcon = L.divIcon({
        className: 'custom-dropoff-pin',
        html: `
          <div style="
            position: relative;
            transform: translate(-50%, -100%);
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <div style="
              width: 38px;
              height: 38px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border-radius: 12px;
              border: 2px solid #ffffff;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>
                <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <div style="
              width: 8px;
              height: 8px;
              background: #059669;
              transform: rotate(45deg);
              margin-top: -4px;
              border: 1px solid white;
            "></div>
          </div>
        `,
        iconSize: [38, 44],
        iconAnchor: [19, 44],
      });

      // Add Restaurant Marker
      const restMarker = L.marker(restCoords, { icon: restaurantIcon }).addTo(map);
      restMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #111;">
          <strong style="color: #ea580c;">🏪 ${infoRef.current.restaurantName}</strong><br/>
          <span>${infoRef.current.restaurantAddress || 'Điểm lấy món'}</span>
        </div>
      `);

      // Add Dropoff Marker
      const dropoffMarker = L.marker(dropoffCoords, { icon: dropoffIcon }).addTo(map);
      dropoffMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; color: #111;">
          <strong style="color: #059669;">🏠 Điểm Giao Hàng</strong><br/>
          <span>${infoRef.current.deliveryAddress}</span>
        </div>
      `);

      // Add Initial Polyline (Glow layer + Core line)
      const glowPolyline = L.polyline([restCoords, dropoffCoords], {
        color: '#06b6d4',
        weight: 8,
        opacity: 0.3,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const mainPolyline = L.polyline([restCoords, dropoffCoords], {
        color: '#0891b2',
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      mapInstanceRef.current = map;
      restMarkerRef.current = restMarker;
      dropoffMarkerRef.current = dropoffMarker;
      polylineGlowRef.current = glowPolyline;
      polylineRef.current = mainPolyline;

      map.fitBounds([restCoords, dropoffCoords], { padding: [40, 40], maxZoom: 16 });
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [restCoords, dropoffCoords]);

  // Update Polyline when Street Coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !polylineRef.current) return;

    if (streetCoordinates && streetCoordinates.length >= 2) {
      polylineRef.current.setLatLngs(streetCoordinates);
      polylineRef.current.setStyle({
        color: '#0891b2',
        weight: 4,
        opacity: 0.95,
        dashArray: undefined,
      });

      if (polylineGlowRef.current) {
        polylineGlowRef.current.setLatLngs(streetCoordinates);
        polylineGlowRef.current.setStyle({
          color: '#06b6d4',
          weight: 8,
          opacity: 0.35,
        });
      }
    } else {
      // Fallback straight line
      const fallbackPoints: [number, number][] = currentDriverCoords
        ? [restCoords, currentDriverCoords, dropoffCoords]
        : [restCoords, dropoffCoords];

      polylineRef.current.setLatLngs(fallbackPoints);
      polylineRef.current.setStyle({
        color: '#f97316',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8',
      });
      if (polylineGlowRef.current) {
        polylineGlowRef.current.setLatLngs([]);
      }
    }
  }, [streetCoordinates, currentDriverCoords, restCoords, dropoffCoords]);

  // Update Driver Marker Position when Coordinates Change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      if (currentDriverCoords) {
        const headingDeg = driverLocation?.heading ?? 45;

        const driverIcon = L.divIcon({
          className: 'custom-driver-pin',
          html: `
            <div style="
              position: relative;
              transform: translate(-50%, -50%);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                position: absolute;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: rgba(16, 185, 129, 0.25);
                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>
              <div style="
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #10b981 0%, #0d9488 100%);
                border-radius: 50%;
                border: 3px solid #ffffff;
                box-shadow: 0 4px 18px rgba(16, 185, 129, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                transform: rotate(${headingDeg}deg);
                transition: transform 0.4s ease;
              ">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="18.5" cy="17.5" r="3.5"/>
                  <circle cx="5.5" cy="17.5" r="3.5"/>
                  <circle cx="15" cy="5" r="1"/>
                  <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLatLng(currentDriverCoords);
          driverMarkerRef.current.setIcon(driverIcon);
        } else {
          driverMarkerRef.current = L.marker(currentDriverCoords, { icon: driverIcon }).addTo(
            mapInstanceRef.current!,
          );
        }
      }
    });
  }, [currentDriverCoords, driverLocation?.heading]);

  // Helper to render Step Maneuver Icon
  const renderManeuverIcon = (step: StreetRouteStep) => {
    const mod = step.modifier?.toLowerCase() || '';
    const type = step.type.toLowerCase();

    if (type === 'arrive') return <Flag className="w-5 h-5 text-emerald-400" />;
    if (type === 'depart') return <Navigation className="w-5 h-5 text-cyan-400" />;
    if (mod.includes('uturn')) return <Undo2 className="w-5 h-5 text-amber-400" />;
    if (mod.includes('sharp right') || mod === 'right')
      return <CornerUpRight className="w-5 h-5 text-cyan-400" />;
    if (mod.includes('slight right')) return <ArrowUpRight className="w-5 h-5 text-cyan-400" />;
    if (mod.includes('sharp left') || mod === 'left')
      return <CornerUpLeft className="w-5 h-5 text-cyan-400" />;
    if (mod.includes('slight left')) return <ArrowUpLeft className="w-5 h-5 text-cyan-400" />;
    return <ArrowUp className="w-5 h-5 text-cyan-400" />;
  };

  const activeStep = currentStep || (steps && steps.length > 0 ? steps[0] : null);

  return (
    <div className="relative w-full h-[380px] sm:h-[440px] rounded-2xl overflow-hidden border border-white/[0.08] bg-zinc-950 shadow-2xl">
      {/* Real-time HUD Indicator Floating Top Left */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-xl text-xs text-white">
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'
            }`}
          />
          <span className="font-semibold">
            {isLiveConnected ? 'Định vị GPS Trực tiếp' : 'Định tuyến đường phố'}
          </span>
          {activeDistance != null && (
            <span className="font-mono px-1.5 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              {activeDistance} km {isRoutingFallback ? '(Chim bay)' : '(Đường bộ)'}
            </span>
          )}
        </div>

        {status === 'DELIVERING' && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-xl text-xs text-zinc-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              Dự kiến đến:{' '}
              <strong className="text-white font-semibold">{etaText}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Control Buttons Floating Top Right */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        <button
          type="button"
          onClick={focusOnDriver}
          title="Tập trung vào tài xế"
          className="p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-300 hover:text-white hover:bg-orange-500/20 hover:border-orange-500/40 backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer"
        >
          <LocateFixed className="w-4 h-4 text-orange-400" />
        </button>

        <button
          type="button"
          onClick={fitAllBounds}
          title="Xem toàn cảnh tuyến đường"
          className="p-2.5 rounded-xl bg-zinc-900/90 border border-white/10 text-zinc-300 hover:text-white hover:bg-orange-500/20 hover:border-orange-500/40 backdrop-blur-md shadow-xl transition-all active:scale-95 cursor-pointer"
        >
          <Maximize2 className="w-4 h-4 text-zinc-300" />
        </button>
      </div>

      {/* Turn-by-Turn Navigation Guidance Floating Banner */}
      {activeStep && (
        <div className="absolute top-16 left-3 right-16 sm:right-auto sm:max-w-md z-[1000] transition-all">
          <div className="rounded-xl border border-white/15 bg-zinc-900/95 backdrop-blur-xl p-3 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  {renderManeuverIcon(activeStep)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      Chỉ dẫn tiếp theo
                    </span>
                    {activeStep.distance_meters > 0 && (
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-semibold">
                        {activeStep.distance_meters} m
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white mt-0.5 line-clamp-2 leading-snug">
                    {activeStep.instruction}
                  </p>
                  {!isBannerCollapsed && nextStep && (
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1 border-t border-white/5 pt-1">
                      Sau đó: <span className="text-zinc-200">{nextStep.instruction}</span>
                    </p>
                  )}
                </div>
              </div>

              {nextStep && (
                <button
                  type="button"
                  onClick={() => setIsBannerCollapsed(!isBannerCollapsed)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  title={isBannerCollapsed ? 'Mở rộng chi tiết' : 'Thu gọn'}
                >
                  {isBannerCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-grab" />

      {/* Floating Bottom Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] p-3 rounded-xl bg-zinc-900/90 border border-white/10 backdrop-blur-md shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0">
            <Store className="w-3.5 h-3.5" />
          </div>
          <span className="text-zinc-200 font-medium truncate max-w-[140px] sm:max-w-[200px]">
            {restaurantName}
          </span>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 shrink-0">
          <span className="font-mono text-[11px] text-cyan-400 font-semibold">
            {activeDistance != null ? `~${activeDistance} km` : 'Đang tính cự ly'}
          </span>
          <span className="text-cyan-500/60">➔</span>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Home className="w-3.5 h-3.5" />
          </div>
          <span
            className="text-zinc-200 font-medium truncate max-w-[140px] sm:max-w-[200px]"
            title={deliveryAddress}
          >
            {deliveryAddress}
          </span>
        </div>
      </div>
    </div>
  );
}
