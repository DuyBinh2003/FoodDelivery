"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Loader2 } from 'lucide-react';

interface LocationMapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    formattedAddress?: string;
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
  }) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    quarter?: string;
    neighbourhood?: string;
    city_district?: string;
    district?: string;
    county?: string;
    city?: string;
    state?: string;
  };
}

export function LocationMapPicker({
  initialLat = 10.77653,
  initialLng = 106.70098,
  onLocationSelect,
}: LocationMapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markerInstanceRef = useRef<LeafletMarker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });

  // Reverse geocode via Nominatim
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'vi,en',
            },
          },
        );
        if (!response.ok) return;
        const data = await response.json();

        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || '';
        const ward = addr.suburb || addr.quarter || addr.neighbourhood || '';
        const district = addr.city_district || addr.district || addr.county || '';
        const city = addr.city || addr.state || 'TP. Hồ Chí Minh';

        onLocationSelect({
          lat,
          lng,
          formattedAddress: data.display_name || '',
          street: road,
          ward,
          district,
          city,
        });
      } catch (err: unknown) {
        console.warn('[LocationMapPicker] Reverse geocode error:', err);
        onLocationSelect({ lat, lng });
      }
    },
    [onLocationSelect],
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom Glowing MapPin Icon
      const customPinIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            position: relative;
            transform: translate(-50%, -100%);
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <div style="
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid #ffffff;
              box-shadow: 0 4px 15px rgba(249, 115, 22, 0.5);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 12px;
                height: 12px;
                background: #ffffff;
                border-radius: 50%;
                transform: rotate(45deg);
              "></div>
            </div>
            <div style="
              width: 14px;
              height: 4px;
              background: rgba(0, 0, 0, 0.4);
              border-radius: 50%;
              margin-top: 2px;
              filter: blur(1px);
            "></div>
          </div>
        `,
        iconSize: [36, 40],
        iconAnchor: [18, 40],
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: customPinIcon,
        draggable: true,
      }).addTo(map);

      // Marker drag event
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCurrentCoords({ lat: pos.lat, lng: pos.lng });
        reverseGeocode(pos.lat, pos.lng);
      });

      // Map click event
      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        setCurrentCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;

      // Initial reverse geocode
      reverseGeocode(initialLat, initialLng);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initialLat, initialLng, reverseGeocode]);

  // Handle Search Input Debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery,
          )}&countrycodes=vn&addressdetails=1&limit=5`,
          {
            headers: {
              'Accept-Language': 'vi,en',
            },
          },
        );
        if (res.ok) {
          const data = (await res.json()) as SearchResult[];
          setSearchResults(data);
        }
      } catch (err: unknown) {
        console.warn('[LocationMapPicker] Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select search result
  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (mapInstanceRef.current && markerInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
      markerInstanceRef.current.setLatLng([lat, lng]);
    }

    setCurrentCoords({ lat, lng });
    setSearchQuery('');
    setSearchResults([]);

    const addr = result.address || {};
    const road = addr.road || addr.suburb || addr.neighbourhood || '';
    const ward = addr.suburb || addr.quarter || addr.neighbourhood || '';
    const district = addr.city_district || addr.district || addr.county || '';
    const city = addr.city || addr.state || 'TP. Hồ Chí Minh';

    onLocationSelect({
      lat,
      lng,
      formattedAddress: result.display_name,
      street: road,
      ward,
      district,
      city,
    });
  };

  // Get current device GPS location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
          markerInstanceRef.current.setLatLng([lat, lng]);
        }

        setCurrentCoords({ lat, lng });
        reverseGeocode(lat, lng);
      },
      (err) => {
        setIsLocating(false);
        console.warn('[LocationMapPicker] Geolocation error:', err);
        alert('Không thể lấy vị trí hiện tại. Vui lòng cho phép quyền truy cập vị trí.');
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  };

  return (
    <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-zinc-700/60 bg-zinc-900 shadow-inner group">
      {/* Search Input Box */}
      <div className="absolute top-3 left-3 right-14 z-[1000]">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm địa chỉ, tòa nhà, đường phố..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (!val.trim() || val.length < 3) {
                setSearchResults([]);
              }
            }}
            className="w-full pl-9 pr-9 py-2 text-xs bg-zinc-900/90 text-white placeholder-zinc-400 rounded-lg border border-zinc-700 shadow-xl backdrop-blur-md focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 transition-all"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5" />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-orange-400 animate-spin absolute right-2.5 top-2.5" />
          )}

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900/95 border border-zinc-700/80 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden max-h-48 overflow-y-auto divide-y divide-zinc-800">
              {searchResults.map((res) => (
                <button
                  key={res.place_id}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full px-3 py-2 text-left hover:bg-orange-500/10 flex items-start gap-2.5 transition-colors group/item"
                >
                  <MapPin className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0 group-hover/item:scale-110 transition-transform" />
                  <span className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                    {res.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Locate Me GPS Button */}
      <button
        type="button"
        title="Định vị vị trí hiện tại"
        onClick={handleCurrentLocation}
        disabled={isLocating}
        className="absolute top-3 right-3 z-[1000] p-2 bg-zinc-900/90 text-zinc-200 hover:text-white hover:bg-orange-600 rounded-lg border border-zinc-700 shadow-xl backdrop-blur-md transition-all active:scale-95 disabled:opacity-50"
      >
        {isLocating ? (
          <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
      </button>

      {/* Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Coordinate & Hint Badge */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] px-2.5 py-1 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-md text-[11px] text-zinc-400 flex items-center gap-1.5 shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
        <span>Ghim: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)} (Kéo ghim hoặc bấm bản đồ)</span>
      </div>
    </div>
  );
}
