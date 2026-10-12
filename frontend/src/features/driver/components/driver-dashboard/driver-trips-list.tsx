'use client';

import React, { useState, useMemo } from 'react';
import { Search, Bike, Filter, Inbox } from 'lucide-react';
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
      // Filter by status
      if (filterStatus === 'DELIVERING' && trip.status !== 'DELIVERING') return false;
      if (filterStatus === 'COMPLETED' && trip.status !== 'COMPLETED') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchId = trip.order_id.toLowerCase().includes(query);
        const matchPickup = trip.pickup_name.toLowerCase().includes(query) || trip.pickup_address.toLowerCase().includes(query);
        const matchDropoff = trip.dropoff_address.toLowerCase().includes(query);
        return matchId || matchPickup || matchDropoff;
      }

      return true;
    });
  }, [trips, filterStatus, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-2xl border border-white/5">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterStatus === 'ALL'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tất cả ({trips.length})
          </button>
          <button
            onClick={() => setFilterStatus('DELIVERING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterStatus === 'DELIVERING'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Đang giao ({trips.filter((t) => t.status === 'DELIVERING').length})
          </button>
          <button
            onClick={() => setFilterStatus('COMPLETED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              filterStatus === 'COMPLETED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Đã hoàn thành ({trips.filter((t) => t.status === 'COMPLETED').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo quán, địa chỉ, mã..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Trips Cards List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 bg-zinc-900/50 border border-white/5 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/40 border border-dashed border-white/10 rounded-2xl text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-500 mb-3">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">Không tìm thấy cuốc xe nào</h3>
          <p className="text-xs text-zinc-400 max-w-sm">
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
