'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Bike, Search, RefreshCw, CheckCircle2, Clock, XCircle, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { adminApi } from '@/features/admin/api/admin-api';
import { AdminUser, AdminDriver, AdminPaginatedResponse } from '@/features/admin/types';
import { PageSizeSelector } from '@/features/admin/components/page-size-selector';

export default function AdminUsersPage() {
  const [tab, setTab] = useState<'CUSTOMERS' | 'DRIVERS'>('CUSTOMERS');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Query Users
  const {
    data: usersResponse,
    isLoading: loadingUsers,
    isRefetching: refetchingUsers,
    refetch: refetchUsers,
  } = useQuery<AdminPaginatedResponse<AdminUser>>({
    queryKey: ['admin', 'users', search, page, pageSize],
    queryFn: () => adminApi.getUsers({ search, page, limit: pageSize }),
    enabled: tab === 'CUSTOMERS',
  });

  // Query Drivers
  const {
    data: driversResponse,
    isLoading: loadingDrivers,
    isRefetching: refetchingDrivers,
    refetch: refetchDrivers,
  } = useQuery<AdminPaginatedResponse<AdminDriver>>({
    queryKey: ['admin', 'drivers', search, page, pageSize],
    queryFn: () => adminApi.getDrivers({ search, page, limit: pageSize }),
    enabled: tab === 'DRIVERS',
  });

  const isLoading = tab === 'CUSTOMERS' ? loadingUsers : loadingDrivers;
  const isRefetching = tab === 'CUSTOMERS' ? refetchingUsers : refetchingDrivers;
  const totalPages =
    tab === 'CUSTOMERS' ? usersResponse?.totalPages || 1 : driversResponse?.totalPages || 1;

  const handleRefresh = () => {
    if (tab === 'CUSTOMERS') refetchUsers();
    else refetchDrivers();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Quản Lý Người Dùng & Tài Xế</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Master Resources
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Tra cứu thông tin tài khoản, khách hàng thành viên, trạng thái phương tiện và đối tác tài xế.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors border border-zinc-800 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-orange-400' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Resource Tabs */}
        <div className="inline-flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium">
          <button
            onClick={() => {
              setTab('CUSTOMERS');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              tab === 'CUSTOMERS'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Khách Hàng ({usersResponse?.total || 0})</span>
          </button>
          <button
            onClick={() => {
              setTab('DRIVERS');
              setPage(1);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              tab === 'DRIVERS'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Tài Xế Đối Tác ({driversResponse?.total || 0})</span>
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
            placeholder={
              tab === 'CUSTOMERS' ? 'Tìm theo email, họ tên, SĐT...' : 'Tìm theo email, tên, biển số xe...'
            }
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {tab === 'CUSTOMERS' ? (
            /* Customers Table */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-900/90 border-b border-zinc-800 uppercase tracking-wider text-zinc-400 font-semibold">
                  <th className="px-6 py-4">Tài Khoản / Email</th>
                  <th className="px-6 py-4">Họ Và Tên</th>
                  <th className="px-6 py-4">Số Điện Thoại</th>
                  <th className="px-6 py-4">Vai Trò</th>
                  <th className="px-6 py-4">Ngày Tham Gia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-zinc-400">
                      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-2" />
                      Đang tải danh sách người dùng...
                    </td>
                  </tr>
                ) : (!usersResponse?.data || usersResponse.data.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-zinc-500">
                      Không tìm thấy tài khoản người dùng nào.
                    </td>
                  </tr>
                ) : (
                  usersResponse.data.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.email}</p>
                            <span className="font-mono text-[10px] text-zinc-500">{u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-300">
                        {u.full_name || <span className="text-zinc-600 italic">Chưa cập nhật</span>}
                      </td>
                      <td className="px-6 py-4 text-zinc-300">
                        {u.phone || <span className="text-zinc-600 italic">Chưa cập nhật</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.role === 'ADMIN'
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {u.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* Drivers Table */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-900/90 border-b border-zinc-800 uppercase tracking-wider text-zinc-400 font-semibold">
                  <th className="px-6 py-4">Tài Xế / Email</th>
                  <th className="px-6 py-4">Họ Và Tên</th>
                  <th className="px-6 py-4">Phương Tiện</th>
                  <th className="px-6 py-4">Biển Số Xe</th>
                  <th className="px-6 py-4">Trạng Thái Nhận Cuốc</th>
                  <th className="px-6 py-4">Tình Trạng Duyệt</th>
                  <th className="px-6 py-4">Ngày Đăng Ký</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                      <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-2" />
                      Đang tải danh sách tài xế...
                    </td>
                  </tr>
                ) : (!driversResponse?.data || driversResponse.data.length === 0) ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-zinc-500">
                      Không tìm thấy tài xế nào.
                    </td>
                  </tr>
                ) : (
                  driversResponse.data.map((d) => (
                    <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                            <Bike className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-semibold text-white">{d.email}</p>
                            <span className="font-mono text-[10px] text-zinc-500">{d.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-300">
                        {d.full_name || <span className="text-zinc-600 italic">Chưa cập nhật</span>}
                      </td>
                      <td className="px-6 py-4 text-zinc-300">{d.vehicle_type || 'Xe máy'}</td>
                      <td className="px-6 py-4 font-mono font-semibold text-amber-400">
                        {d.vehicle_plate || <span className="text-zinc-600 italic font-sans font-normal">Chưa cập nhật</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            d.status === 'ONLINE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              d.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                            }`}
                          />
                          {d.status === 'ONLINE' ? 'Trực tuyến' : 'Ngoại tuyến'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            d.verification_status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : d.verification_status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {d.verification_status === 'APPROVED' ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : d.verification_status === 'PENDING' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          {d.verification_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">
                        {new Date(d.created_at).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span>
              Tổng số <span className="text-white font-medium">{tab === 'CUSTOMERS' ? usersResponse?.total || 0 : driversResponse?.total || 0}</span> {tab === 'CUSTOMERS' ? 'khách hàng' : 'tài xế'}
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
