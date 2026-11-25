'use client';

import React, { useState, useMemo } from 'react';
import { Search, Inbox } from 'lucide-react';
import type { DriverTrip } from '@/features/driver/types/driver.types';
import { DriverTripCard } from './driver-trip-card';

interface DriverTripsListProps {
  trips: DriverTrip[];
  loading?: boolean;
  onCompleteTrip?: (orderId: string) => Promise<void>;
}

type FilterStatus = 'ALL' | 'DELIVERING' | 'COMPLETED';

export function DriverTripsList({ trips, loading, onCompleteTrip }: DriverTripsListProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (filterStatus === 'DELIVERING' && trip.status !== 'DELIVERING') return false;
      if (filterStatus === 'COMPLETED' && trip.status !== 'COMPLETED') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchId = trip.order_id.toLowerCase().includes(query);
        const matchPickup =
          trip.pickup_name.toLowerCase().includes(query) ||
          trip.pickup_address.toLowerCase().includes(query);
        const matchDropoff = trip.dropoff_address.toLowerCase().includes(query);
        return matchId || matchPickup || matchDropoff;
      }

      return true;
    });
  }, [trips, filterStatus, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="flex items-center gap-1 bg-secondary p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tất cả ({trips.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DELIVERING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'DELIVERING'
                ? 'bg-sky-500 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Đang giao ({trips.filter((t) => t.status === 'DELIVERING').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === 'COMPLETED'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Đã hoàn thành ({trips.filter((t) => t.status === 'COMPLETED').length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo quán, địa chỉ, mã..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-input rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 bg-card border border-border rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card border border-dashed border-border rounded-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-3">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="font-heading text-base font-bold text-foreground mb-1">
            Không tìm thấy cuốc xe nào
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {searchQuery
              ? 'Không có cuốc xe nào phù hợp với từ khóa tìm kiếm.'
              : 'Bạn chưa có chuyến đi nào trong danh mục này. Hãy bật trạng thái Trực Tuyến để sẵn sàng nhận cuốc mới!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrips.map((trip) => (
            <DriverTripCard key={trip.id} trip={trip} onCompleteTrip={onCompleteTrip} />
          ))}
        </div>
      )}
    </div>
  );
}
