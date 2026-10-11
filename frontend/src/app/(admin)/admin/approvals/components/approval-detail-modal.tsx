'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Store, User, Calendar, MapPin, AlertCircle, Car } from 'lucide-react';

export interface PendingApprovalItem {
  id: string;
  userId: string;
  userEmail: string;
  name: string;
  type: 'RESTAURANT' | 'DRIVER';
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
  created_at?: string;
}

interface ApprovalDetailModalProps {
  item: PendingApprovalItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReview: (id: string, status: 'APPROVED' | 'REJECTED', reviewMessage?: string) => Promise<void>;
  isSubmitting: boolean;
}

function ApprovalDetailDialogContent({
  item,
  onClose,
  onReview,
  isSubmitting,
}: {
  item: PendingApprovalItem;
  onClose: () => void;
  onReview: (id: string, status: 'APPROVED' | 'REJECTED', reviewMessage?: string) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [reviewMessage, setReviewMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const isRestaurant = item.type === 'RESTAURANT';
  const restaurantName = (item.payload?.restaurant_name as string) || (item.payload?.name as string) || item.name;
  const address = (item.payload?.address as string) || 'Chưa cung cấp địa chỉ';
  const vehiclePlate = (item.payload?.vehicle_plate as string) || 'Chưa cung cấp';

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    setErrorMessage('');
    if (status === 'REJECTED' && !reviewMessage.trim()) {
      setErrorMessage('Vui lòng nhập lý do từ chối để thông báo cụ thể cho người đăng ký.');
      return;
    }
    await onReview(item.id, status, reviewMessage.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />

      {/* Modal Dialog Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-10 transition-all flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-900/90">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isRestaurant
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {isRestaurant ? <Store className="w-5 h-5" /> : <Car className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-bold text-white tracking-tight">
                {isRestaurant ? 'Hồ Sơ Đăng Ký Mở Nhà Hàng' : 'Hồ Sơ Đăng Ký Tài Xế'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Mã hồ sơ: <span className="font-mono text-zinc-300">{item.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Card: Thông tin người nộp đơn */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4.5 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-orange-400" /> Thông tin tài khoản đăng ký
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-zinc-500 text-xs block">Email liên hệ:</span>
                <span className="text-zinc-200 font-medium">{item.userEmail || 'Chưa cập nhật'}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-xs block">User ID:</span>
                <span className="text-zinc-400 font-mono text-xs truncate block">{item.userId}</span>
              </div>
              <div>
                <span className="text-zinc-500 text-xs block">Thời gian nộp đơn:</span>
                <span className="text-zinc-300 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 text-xs block">Trạng thái hiện tại:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Chờ xét duyệt (PENDING)
                </span>
              </div>
            </div>
          </div>

          {/* Card: Thông tin chi tiết nhà hàng / tài xế */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4.5 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              {isRestaurant ? (
                <>
                  <Store className="w-3.5 h-3.5 text-emerald-400" /> Chi tiết thông tin nhà hàng
                </>
              ) : (
                <>
                  <Car className="w-3.5 h-3.5 text-amber-400" /> Chi tiết thông tin phương tiện
                </>
              )}
            </h4>

            {isRestaurant ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-zinc-500 text-xs block">Tên nhà hàng / quán ăn:</span>
                  <span className="text-lg font-bold text-white block mt-0.5">{restaurantName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 text-xs block">Địa chỉ kinh doanh:</span>
                  <div className="flex items-start gap-1.5 text-zinc-200 mt-0.5">
                    <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <span>{address}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-zinc-500 text-xs block">Biển số xe:</span>
                  <span className="text-lg font-bold text-white block mt-0.5 font-mono">{vehiclePlate}</span>
                </div>
              </div>
            )}
          </div>

          {/* Khu vực phản hồi của Admin */}
          <div className="space-y-2">
            <label htmlFor="review-message" className="block text-sm font-semibold text-zinc-200">
              Lời nhắn / Lý do phản hồi tới người nộp đơn:
            </label>
            <p className="text-xs text-zinc-400">
              Tin nhắn này sẽ được gửi trực tiếp tới màn hình của người dùng qua thông báo Real-time Toast.
              <span className="text-amber-400 font-medium ml-1">
                (Bắt buộc khi Từ chối)
              </span>
            </p>
            <textarea
              id="review-message"
              rows={3}
              value={reviewMessage}
              onChange={(e) => {
                setReviewMessage(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder={
                isRestaurant
                  ? 'Ví dụ khi duyệt: Chào mừng đối tác đã gia nhập hệ thống FoodDelivery!\nVí dụ khi từ chối: Địa chỉ chưa rõ ràng, vui lòng bổ sung số nhà và hình ảnh mặt tiền...'
                  : 'Nhập lời nhắn hoặc lý do phản hồi cho tài xế...'
              }
              className={`w-full bg-zinc-950 border ${
                errorMessage ? 'border-red-500 focus:ring-red-500' : 'border-zinc-800 focus:ring-orange-500'
              } text-zinc-100 rounded-xl px-4 py-3 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 resize-none transition-all`}
              disabled={isSubmitting}
            />
            {errorMessage && (
              <p className="text-xs text-red-400 flex items-center gap-1.5 mt-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> {errorMessage}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-zinc-800 bg-zinc-950/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-colors disabled:opacity-50"
          >
            Đóng
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleAction('REJECTED')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-600 border border-red-500/20 rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              {isSubmitting ? 'Đang xử lý...' : 'Từ chối hồ sơ'}
            </button>

            <button
              type="button"
              onClick={() => handleAction('APPROVED')}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Đang kích hoạt...' : 'Chấp thuận & Duyệt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApprovalDetailModal({
  item,
  isOpen,
  onClose,
  onReview,
  isSubmitting,
}: ApprovalDetailModalProps) {
  if (!isOpen || !item) return null;

  return (
    <ApprovalDetailDialogContent
      key={item.id}
      item={item}
      onClose={onClose}
      onReview={onReview}
      isSubmitting={isSubmitting}
    />
  );
}
