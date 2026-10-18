'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Store, Search, RefreshCw, Star, CheckCircle2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { adminApi } from '@/features/admin/api/admin-api';
import { AdminRestaurant, AdminPaginatedResponse } from '@/features/admin/types';
import { PageSizeSelector } from '@/features/admin/components/page-size-selector';

export default function AdminRestaurantsPage() {
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const {
    data: restaurantsResponse,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AdminPaginatedResponse<AdminRestaurant>>({
    queryKey: ['admin', 'restaurants', status, search, page, pageSize],
    queryFn: () =>
      adminApi.getRestaurants({
        status: status !== 'ALL' ? status : undefined,
        search,
        page,
        limit: pageSize,
      }),
  });

  const totalPages = restaurantsResponse?.totalPages || 1;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Quản Lý Nhà Hàng Đối Tác</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Merchants & Catalog
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Theo dõi trạng thái mở bán, địa chỉ cơ sở, xếp hạng đánh giá và quản lý các quán ăn trên nền tảng.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors border border-zinc-800 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-orange-400' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium">
          <button
            onClick={() => {
              setStatus('ALL');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              status === 'ALL'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => {
              setStatus('ACTIVE');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              status === 'ACTIVE'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Đang mở bán
          </button>
          <button
            onClick={() => {
              setStatus('INACTIVE');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              status === 'INACTIVE'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tạm đóng cửa
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên quán, địa chỉ..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Restaurants Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-900/90 border-b border-zinc-800 uppercase tracking-wider text-zinc-400 font-semibold">
                <th className="px-6 py-4">Tên Quán Ăn / ID</th>
                <th className="px-6 py-4">Địa Chỉ</th>
                <th className="px-6 py-4">Đánh Giá</th>
                <th className="px-6 py-4">Trạng Thái Mở Quán</th>
                <th className="px-6 py-4">Tình Trạng Duyệt</th>
                <th className="px-6 py-4 text-right">Ngày Tham Gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-400">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-2" />
                    Đang tải danh sách quán ăn...
                  </td>
                </tr>
              ) : (!restaurantsResponse?.data || restaurantsResponse.data.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-zinc-500">
                    Không tìm thấy quán ăn nào phù hợp.
                  </td>
                </tr>
              ) : (
                restaurantsResponse.data.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center font-bold text-xs border border-orange-500/20">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{r.name}</p>
                          <span className="font-mono text-[10px] text-zinc-500">{r.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-300 max-w-xs truncate" title={r.address}>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="truncate">{r.address || <span className="text-zinc-600 italic">Chưa cập nhật</span>}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        {Number(r.rating || 5.0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          r.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            r.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                          }`}
                        />
                        {r.is_active ? 'Đang mở bán' : 'Tạm đóng cửa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {r.verification_status || 'APPROVED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-400">
                      {new Date(r.created_at).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span>
              Tổng số <span className="text-white font-medium">{restaurantsResponse?.total || 0}</span> quán ăn
            </span>
            <PageSizeSelector
              pageSize={pageSize}
              onChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
            />
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-zinc-300 font-medium">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
