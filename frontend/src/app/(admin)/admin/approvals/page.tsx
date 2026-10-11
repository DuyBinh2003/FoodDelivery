'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CheckCircle2, XCircle, Eye, Store, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ApprovalDetailModal,
  PendingApprovalItem,
} from '@/app/(admin)/admin/approvals/components/approval-detail-modal';

export default function AdminApprovalsPage() {
  const [selectedItem, setSelectedItem] = useState<PendingApprovalItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: approvals = [], isLoading: loading, refetch } = useQuery<PendingApprovalItem[]>({
    queryKey: ['admin', 'approvals'],
    queryFn: async () => {
      const data = await apiClient<{
        restaurants?: PendingApprovalItem[];
        drivers?: PendingApprovalItem[];
      }>('/admin/approvals/pending');

      const mappedRestaurants = (data.restaurants || []).map((r) => ({
        id: r.id,
        userId: r.userId || '',
        userEmail: r.userEmail || '',
        name: r.name || 'Unknown',
        type: 'RESTAURANT' as const,
        payload: r.payload || {},
        status: r.status || 'PENDING',
        createdAt: r.createdAt || r.created_at || new Date().toISOString(),
      }));

      const mappedDrivers = (data.drivers || []).map((d) => ({
        id: d.id,
        userId: d.userId || '',
        userEmail: d.userEmail || '',
        name: d.name || 'Unknown',
        type: 'DRIVER' as const,
        payload: d.payload || {},
        status: d.status || 'PENDING',
        createdAt: d.createdAt || d.created_at || new Date().toISOString(),
      }));

      return [...mappedRestaurants, ...mappedDrivers].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },
  });

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED', reviewMessage?: string) => {
    setIsSubmitting(true);
    try {
      await apiClient(`/admin/approvals/${id}/review`, {
        method: 'POST',
        body: {
          status,
          review_message: reviewMessage,
        },
      });

      toast.success(status === 'APPROVED' ? 'Đã phê duyệt hồ sơ thành công!' : 'Đã từ chối hồ sơ.');
      setIsModalOpen(false);
      setSelectedItem(null);
      await refetch();
    } catch (error: unknown) {
      console.error('Failed to review approval:', error);
      toast.error('Lỗi khi xử lý hồ sơ: ' + ((error as Error)?.message || 'Vui lòng thử lại'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetailModal = (app: PendingApprovalItem) => {
    setSelectedItem(app);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Xét Duyệt Hồ Sơ</h1>
        <p className="text-zinc-400 mt-1">Quản lý và xét duyệt các yêu cầu đăng ký mở quán và đối tác tài xế.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/90 border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-400">
                <th className="px-6 py-4 font-semibold">Loại hồ sơ</th>
                <th className="px-6 py-4 font-semibold">Tên quán / Tài khoản</th>
                <th className="px-6 py-4 font-semibold">Người nộp đơn</th>
                <th className="px-6 py-4 font-semibold">Thời gian nộp</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-zinc-500 text-sm">
                    Hiện không có hồ sơ nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                approvals.map((app) => (
                  <tr key={app.id} className="hover:bg-zinc-800/30 transition-colors">
                    {/* Loại */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          app.type === 'RESTAURANT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {app.type === 'RESTAURANT' ? <Store className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                        {app.type === 'RESTAURANT' ? 'Nhà Hàng' : 'Tài Xế'}
                      </span>
                    </td>

                    {/* Tên */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-white block">{app.name}</span>
                      {app.type === 'RESTAURANT' && Boolean((app.payload as Record<string, unknown>)?.address) && (
                        <span className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                          {String((app.payload as Record<string, unknown>).address)}
                        </span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-sm text-zinc-300">
                      {app.userEmail || <span className="font-mono text-xs text-zinc-500">{app.userId}</span>}
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-6 py-4 text-xs text-zinc-400">
                      {new Date(app.createdAt).toLocaleString('vi-VN')}
                    </td>

                    {/* Hành động */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Nút Xem chi tiết */}
                        <button
                          type="button"
                          onClick={() => openDetailModal(app)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 rounded-lg transition-colors"
                          title="Xem chi tiết hồ sơ"
                        >
                          <Eye className="w-3.5 h-3.5 text-orange-400" />
                          <span>Chi tiết</span>
                        </button>

                        {/* Nút Phê duyệt nhanh */}
                        <button
                          type="button"
                          onClick={() => handleReview(app.id, 'APPROVED')}
                          disabled={isSubmitting}
                          className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Phê duyệt ngay"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        {/* Nút Từ chối -> Mở modal để nhập lý do */}
                        <button
                          type="button"
                          onClick={() => openDetailModal(app)}
                          disabled={isSubmitting}
                          className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                          title="Từ chối hồ sơ (Yêu cầu nhập lý do)"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup Chi Tiết Hồ Sơ */}
      <ApprovalDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onReview={handleReview}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
