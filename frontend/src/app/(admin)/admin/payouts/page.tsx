'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
} from 'lucide-react';
import { adminApi } from '@/features/admin/api/admin-api';
import type { AdminPayoutItem } from '@/features/admin/types';

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('ALL');

  // Modals state
  const [qrModalItem, setQrModalItem] = useState<AdminPayoutItem | null>(null);
  const [approveModalItem, setApproveModalItem] = useState<AdminPayoutItem | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<AdminPayoutItem | null>(null);
  const [bankTxnRef, setBankTxnRef] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: payoutsData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'payouts', page, pageSize, statusFilter],
    queryFn: () =>
      adminApi.getPayouts({
        page,
        limit: pageSize,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) => adminApi.approvePayout(id, ref),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      setApproveModalItem(null);
      setBankTxnRef('');
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Duyệt rút tiền thất bại';
      setActionError(msg);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adminApi.rejectPayout(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'payouts'] });
      setRejectModalItem(null);
      setRejectReason('');
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Từ chối rút tiền thất bại';
      setActionError(msg);
    },
  });

  const formatVND = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5" />
            Chờ duyệt
          </span>
        );
      case 'COMPLETED':
      case 'APPROVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã chi
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5" />
            Từ chối
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 w-fit">
            {status}
          </span>
        );
    }
  };

  const totalPages = payoutsData?.totalPages || 1;
  const items: AdminPayoutItem[] = payoutsData?.items || payoutsData?.data || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Quyết Toán & Rút Tiền Đối Tác (Payout Engine)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              VietQR / Napas
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Kiểm tra yêu cầu rút tiền từ ví tài xế và quán ăn, chuyển khoản ngân hàng và đối soát sổ cái.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors border border-zinc-800 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-orange-400' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        {(['ALL', 'PENDING', 'COMPLETED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === tab
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {tab === 'ALL' && 'Tất cả'}
            {tab === 'PENDING' && 'Chờ duyệt'}
            {tab === 'COMPLETED' && 'Đã chi'}
            {tab === 'REJECTED' && 'Đã từ chối'}
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Thời gian</th>
                <th className="py-3.5 px-4">Đối tác</th>
                <th className="py-3.5 px-4">Số tiền rút</th>
                <th className="py-3.5 px-4">Tài khoản thụ hưởng</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Giao dịch tham chiếu</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Đang tải danh sách yêu cầu rút tiền...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Không có yêu cầu rút tiền nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.requester_type === 'DRIVER'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          }`}
                        >
                          {item.requester_type === 'DRIVER' ? 'Tài xế' : 'Quán ăn'}
                        </span>
                        <span className="font-mono text-zinc-400">{item.requester_id.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-white font-mono text-sm">
                        {formatVND(item.amount)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <Building2 className="w-3.5 h-3.5 text-orange-400" />
                          <span>{item.bank_code}</span>
                          <span className="text-zinc-500">•</span>
                          <span className="font-mono text-zinc-300">{item.bank_account_number}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 uppercase font-semibold">{item.bank_account_name}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                      {item.bank_transaction_ref || item.rejection_reason || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* VietQR Quick Scan */}
                        <button
                          onClick={() => setQrModalItem(item)}
                          title="Tạo mã VietQR quét thanh toán"
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                        >
                          <QrCode className="w-4 h-4 text-orange-400" />
                        </button>

                        {/* Duyệt & Từ chối nếu PENDING */}
                        {item.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setApproveModalItem(item);
                                setBankTxnRef('');
                                setActionError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 font-medium transition-colors"
                            >
                              Duyệt
                            </button>
                            <button
                              onClick={() => {
                                setRejectModalItem(item);
                                setRejectReason('');
                                setActionError(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-medium transition-colors"
                            >
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Trang {page} / {totalPages} (Tổng {payoutsData?.total || 0} lệnh)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VietQR Modal */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setQrModalItem(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white">Mã VietQR Chuyển Khoản Nhanh</h3>
            <p className="text-xs text-zinc-400 mt-1">Dùng app ngân hàng bất kỳ để quét thanh toán</p>

            <div className="my-5 p-3 bg-white rounded-xl inline-block shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.vietqr.io/image/${qrModalItem.bank_code}-${qrModalItem.bank_account_number}-compact2.png?amount=${qrModalItem.amount}&addInfo=Payout_${qrModalItem.id.slice(0, 8)}`}
                alt="VietQR Payout"
                className="w-56 h-auto mx-auto object-contain"
              />
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-left text-xs space-y-1 mb-4">
              <p className="text-zinc-400">
                Thụ hưởng: <strong className="text-white">{qrModalItem.bank_account_name}</strong>
              </p>
              <p className="text-zinc-400">
                STK: <strong className="text-white font-mono">{qrModalItem.bank_account_number} ({qrModalItem.bank_code})</strong>
              </p>
              <p className="text-zinc-400">
                Số tiền: <strong className="text-emerald-400 font-mono">{formatVND(qrModalItem.amount)}</strong>
              </p>
            </div>

            <button
              onClick={() => {
                setApproveModalItem(qrModalItem);
                setQrModalItem(null);
                setBankTxnRef('');
                setActionError(null);
              }}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
            >
              Đã chuyển khoản xong &rarr; Duyệt lệnh
            </button>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setApproveModalItem(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white">Xác nhận Phê duyệt Rút tiền</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Quyết toán {formatVND(approveModalItem.amount)} cho đối tác {approveModalItem.bank_account_name}
            </p>

            {actionError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="my-4">
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Mã tham chiếu ngân hàng (Bank Transaction Ref)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: FT260338827721 hoặc VCB_992817"
                value={bankTxnRef}
                onChange={(e) => setBankTxnRef(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setApproveModalItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!bankTxnRef.trim() || approveMutation.isPending}
                onClick={() =>
                  approveMutation.mutate({
                    id: approveModalItem.id,
                    ref: bankTxnRef.trim(),
                  })
                }
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-semibold"
              >
                {approveMutation.isPending ? 'Đang duyệt...' : 'Xác nhận Duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setRejectModalItem(null)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white">Từ chối Yêu cầu Rút tiền</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Số tiền {formatVND(rejectModalItem.amount)} sẽ được hoàn trả lập tức về số dư khả dụng của đối tác.
            </p>

            {actionError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="my-4">
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Lý do từ chối (hiển thị cho đối tác)
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Sai tên chủ tài khoản, Số tài khoản không tồn tại tại ngân hàng..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectModalItem.id,
                    reason: rejectReason.trim(),
                  })
                }
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-semibold"
              >
                {rejectMutation.isPending ? 'Đang hoàn tiền...' : 'Xác nhận Từ chối & Hoàn tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
