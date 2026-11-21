'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Bike,
  ShieldAlert,
} from 'lucide-react';
import { adminApi } from '@/features/admin/api/admin-api';
import type { OrderDispute, DisputeDetailsResponse } from '@/features/orders/types/dispute.types';

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED' | 'REJECTED'>('ALL');

  // Selected dispute detail modal state
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'FULL_REFUND' | 'PARTIAL_REFUND' | 'REJECT'>('FULL_REFUND');
  const [customRefundAmount, setCustomRefundAmount] = useState<number | ''>('');
  const [penaltyParty, setPenaltyParty] = useState<'RESTAURANT' | 'DRIVER' | 'PLATFORM'>('RESTAURANT');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: disputesData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'disputes', page, pageSize, statusFilter],
    queryFn: () =>
      adminApi.getDisputes({
        page,
        limit: pageSize,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  });

  const {
    data: detailData,
    isLoading: isDetailLoading,
  } = useQuery<DisputeDetailsResponse | null>({
    queryKey: ['admin', 'dispute-details', selectedDisputeId],
    queryFn: () => (selectedDisputeId ? adminApi.getDisputeDetails(selectedDisputeId) : null),
    enabled: Boolean(selectedDisputeId),
  });

  const resolveMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      resolution_action: string;
      refund_amount?: number;
      penalty_party?: string;
      resolution_notes?: string;
    }) =>
      adminApi.resolveDispute(payload.id, {
        resolution_action: payload.resolution_action,
        refund_amount: payload.refund_amount,
        penalty_party: payload.penalty_party,
        resolution_notes: payload.resolution_notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dispute-details', selectedDisputeId] });
      setSelectedDisputeId(null);
      setResolutionNotes('');
      setActionError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Xử lý khiếu nại thất bại';
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
            KHẨN CẤP
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            ƯU TIÊN CAO
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/50">
            BÌNH THƯỜNG
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 w-fit">
            <Clock className="w-3.5 h-3.5" />
            Đang chờ xử lý
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã bồi hoàn
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5" />
            Đã bác bỏ
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

  const getReasonLabel = (code: string) => {
    switch (code) {
      case 'DAMAGED_FOOD':
        return 'Đồ ăn bị đổ / hư hỏng';
      case 'WRONG_ITEMS':
        return 'Giao sai hoặc thiếu món';
      case 'NEVER_ARRIVED':
        return 'Chưa nhận được đồ ăn';
      case 'RUDE_BEHAVIOR':
        return 'Thái độ phục vụ kém';
      default:
        return 'Sự cố khác';
    }
  };

  const items: OrderDispute[] = disputesData?.items || [];
  const totalPages = disputesData?.totalPages || 1;

  const handleExecuteResolution = () => {
    if (!selectedDisputeId) return;
    setActionError(null);

    const orderTotal = Number(detailData?.order?.total_amount) || 0;
    let finalAmount = 0;
    if (actionType === 'FULL_REFUND') {
      finalAmount = orderTotal;
    } else if (actionType === 'PARTIAL_REFUND') {
      finalAmount = Number(customRefundAmount) || 0;
      if (finalAmount <= 0) {
        setActionError('Vui lòng nhập số tiền bồi hoàn một phần hợp lệ');
        return;
      }
    }

    resolveMutation.mutate({
      id: selectedDisputeId,
      resolution_action: actionType,
      refund_amount: finalAmount,
      penalty_party: actionType === 'REJECT' ? undefined : penaltyParty,
      resolution_notes: resolutionNotes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Cổng Chăm Sóc Khách Hàng & Xử Lý Khiếu Nại (CS Portal)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Dispute Resolution
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Tiếp nhận sự cố từ khách hàng, đối chiếu ảnh bàn giao POD của tài xế và thực thi bồi hoàn tự động.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-medium transition-colors border border-zinc-800 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-orange-400' : ''}`} />
          <span>Làm mới tickets</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        {(['ALL', 'OPEN', 'RESOLVED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === tab
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {tab === 'ALL' && 'Tất cả'}
            {tab === 'OPEN' && 'Chờ xử lý'}
            {tab === 'RESOLVED' && 'Đã bồi hoàn'}
            {tab === 'REJECTED' && 'Đã bác bỏ'}
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
                <th className="py-3.5 px-4">Ưu tiên</th>
                <th className="py-3.5 px-4">Đơn hàng</th>
                <th className="py-3.5 px-4">Lý do khiếu nại</th>
                <th className="py-3.5 px-4">Bằng chứng</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Đang tải danh sách khiếu nại...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Không có ticket khiếu nại nào.
                  </td>
                </tr>
              ) : (
                items.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400 font-mono">
                      {formatDate(dispute.created_at)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getPriorityBadge(dispute.priority)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      #{dispute.order_id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-white">{getReasonLabel(dispute.reason_code)}</p>
                        <p className="text-[11px] text-zinc-400 truncate max-w-xs">{dispute.description}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {dispute.evidence_images && dispute.evidence_images.length > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-400 font-mono text-[11px]">
                          {dispute.evidence_images.length} ảnh
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(dispute.status)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedDisputeId(dispute.id);
                          setActionError(null);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 font-semibold transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Đối soát & Xử lý</span>
                      </button>
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
              Trang {page} / {totalPages} (Tổng {disputesData?.total || 0} tickets)
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

      {/* Dispute Investigation & Resolution Modal */}
      {selectedDisputeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedDisputeId(null)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            {isDetailLoading ? (
              <div className="py-20 text-center text-zinc-500">Đang tải dữ liệu đối soát đơn hàng...</div>
            ) : !detailData ? (
              <div className="py-20 text-center text-zinc-500">Không tìm thấy thông tin khiếu nại</div>
            ) : (
              <div className="space-y-6">
                {/* Modal Title */}
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-zinc-400">TICKET #{detailData.dispute.id.slice(0, 8)}</span>
                    {getPriorityBadge(detailData.dispute.priority)}
                    {getStatusBadge(detailData.dispute.status)}
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                    {getReasonLabel(detailData.dispute.reason_code)} (Đơn #{detailData.dispute.order_id.slice(0, 8)})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Gửi lúc {formatDate(detailData.dispute.created_at)} bởi Khách hàng {detailData.dispute.customer_id.slice(0, 8)}...
                  </p>
                </div>

                {/* Evidence Comparison Grid (Khách hàng vs Tài xế POD) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cột Khách Hàng */}
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Ảnh bằng chứng từ Khách hàng
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-300 italic mb-3 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                      &quot;{detailData.dispute.description}&quot;
                    </p>
                    {detailData.dispute.evidence_images && detailData.dispute.evidence_images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {detailData.dispute.evidence_images.map((img, i) => (
                          <div key={i} className="aspect-square rounded-xl overflow-hidden border border-zinc-700 bg-black">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img} alt="Customer Evidence" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-zinc-500">Khách hàng không đính kèm ảnh</div>
                    )}
                  </div>

                  {/* Cột Tài Xế POD */}
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bike className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Ảnh bàn giao (POD) từ Tài xế
                      </h4>
                    </div>
                    {detailData.driverProofs && detailData.driverProofs.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {detailData.driverProofs.map((proof) => (
                          <div key={proof.id} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-700 bg-black">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={proof.photo_url} alt="POD Proof" className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-black/80 text-emerald-400 font-mono">
                              {proof.proof_type}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-zinc-500">
                        Chưa có ảnh bằng chứng bàn giao từ tài xế
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Summary & Pricing */}
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-zinc-400">Giá trị đơn hàng:</span>
                    <p className="text-lg font-extrabold text-white font-mono">
                      {formatVND(detailData.order?.total_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Trạng thái đơn:</span>
                    <p className="text-sm font-semibold text-amber-400 font-mono">
                      {detailData.order?.status || 'UNKNOWN'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400">Hình thức thanh toán:</span>
                    <p className="text-sm font-semibold text-zinc-300 font-mono">
                      {String(detailData.order?.payment_method || 'VNPAY')}
                    </p>
                  </div>
                </div>

                {/* Resolution Action Box */}
                {detailData.dispute.status === 'OPEN' && (
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-orange-500/30 space-y-4">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-orange-400" />
                      <span>Quyết định Xử lý & Bồi hoàn Sổ cái</span>
                    </h4>

                    {actionError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{actionError}</span>
                      </div>
                    )}

                    {/* Action Selector */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setActionType('FULL_REFUND')}
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                          actionType === 'FULL_REFUND'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Hoàn tiền 100% ({formatVND(detailData.order?.total_amount || 0)})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionType('PARTIAL_REFUND')}
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                          actionType === 'PARTIAL_REFUND'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Hoàn tiền một phần
                      </button>

                      <button
                        type="button"
                        onClick={() => setActionType('REJECT')}
                        className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                          actionType === 'REJECT'
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Bác bỏ khiếu nại
                      </button>
                    </div>

                    {/* Partial amount input */}
                    {actionType === 'PARTIAL_REFUND' && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Số tiền hoàn cho khách (VND)
                        </label>
                        <input
                          type="number"
                          placeholder="Ví dụ: 35000"
                          value={customRefundAmount}
                          onChange={(e) => setCustomRefundAmount(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    )}

                    {/* Penalty Party selector */}
                    {actionType !== 'REJECT' && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                          Bên chịu trách nhiệm phạt tiền (Trừ từ ví đối tác)
                        </label>
                        <div className="flex gap-2">
                          {(['RESTAURANT', 'DRIVER', 'PLATFORM'] as const).map((party) => (
                            <button
                              key={party}
                              type="button"
                              onClick={() => setPenaltyParty(party)}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-colors ${
                                penaltyParty === party
                                  ? 'bg-orange-500 text-white border-orange-500 font-semibold'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {party === 'RESTAURANT' && 'Quán ăn'}
                              {party === 'DRIVER' && 'Tài xế'}
                              {party === 'PLATFORM' && 'Sàn bồi hoàn'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resolution Notes */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Ghi chú quyết định xử lý
                      </label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Đã đối soát ảnh đổ vỡ, bồi thường cho khách và cảnh cáo quán"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={resolveMutation.isPending}
                      onClick={handleExecuteResolution}
                      className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {resolveMutation.isPending ? 'Đang thực thi Sổ cái...' : 'Thực thi Quyết định'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
