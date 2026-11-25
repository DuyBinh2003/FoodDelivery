'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Camera,
} from 'lucide-react';
import { disputeApi } from '@/features/orders/api/dispute-api';
import type { DisputeReasonCode } from '@/features/orders/types/dispute.types';

interface ReportIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  customerId?: string;
  onSuccess?: () => void;
}

const ISSUE_REASONS: Array<{ code: DisputeReasonCode; label: string; description: string }> = [
  {
    code: 'DAMAGED_FOOD',
    label: 'Đồ ăn bị đổ / hư hỏng',
    description: 'Hộp thức ăn bị dập, canh hoặc nước uống bị tràn ra ngoài',
  },
  {
    code: 'WRONG_ITEMS',
    label: 'Giao sai hoặc thiếu món',
    description: 'Không đúng món đã đặt hoặc thiếu một phần trong đơn',
  },
  {
    code: 'NEVER_ARRIVED',
    label: 'Chưa nhận được đồ ăn',
    description: 'Ứng dụng báo hoàn tất nhưng bạn thực tế chưa nhận được đơn',
  },
  {
    code: 'RUDE_BEHAVIOR',
    label: 'Thái độ phục vụ không tốt',
    description: 'Tài xế hoặc quán ăn có lời nói hoặc hành vi không đúng mực',
  },
  {
    code: 'OTHER',
    label: 'Vấn đề khác',
    description: 'Các sự cố khác cần bộ phận chăm sóc khách hàng can thiệp',
  },
];

export function ReportIssueDialog({
  isOpen,
  onClose,
  orderId,
  customerId,
  onSuccess,
}: ReportIssueDialogProps) {
  const [selectedReason, setSelectedReason] = useState<DisputeReasonCode>('DAMAGED_FOOD');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    if (images.length >= 3) {
      setErrorMsg('Tối đa 3 ảnh bằng chứng sự cố');
      return;
    }
    setImages([...images, imageUrl.trim()]);
    setImageUrl('');
    setErrorMsg(null);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!description.trim() || description.trim().length < 10) {
      setErrorMsg('Vui lòng mô tả chi tiết sự cố (tối thiểu 10 ký tự)');
      return;
    }

    try {
      setSubmitting(true);
      await disputeApi.createDispute({
        order_id: orderId,
        customer_id: customerId,
        reason_code: selectedReason,
        description: description.trim(),
        evidence_images: images,
      });

      setSuccessMsg('Gửi khiếu nại thành công! Đội ngũ CS sẽ liên hệ xử lý trong ít phút.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi báo cáo sự cố';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border rounded-3xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">Báo Cáo Sự Cố Đơn Hàng</h2>
            <p className="text-xs text-muted-foreground">Đơn hàng #{orderId.slice(0, 8)}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">Vấn đề bạn gặp phải</label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {ISSUE_REASONS.map((reason) => (
                <label
                  key={reason.code}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedReason === reason.code
                      ? 'bg-primary/10 border-primary/40 text-foreground'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                >
                  <input
                    type="radio"
                    name="issueReason"
                    value={reason.code}
                    checked={selectedReason === reason.code}
                    onChange={() => setSelectedReason(reason.code)}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{reason.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{reason.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Mô tả chi tiết sự việc
            </label>
            <textarea
              rows={3}
              placeholder="Vui lòng mô tả cụ thể món bị hỏng/thiếu hoặc sự cố phát sinh..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Evidence photos */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Ảnh bằng chứng chụp thực tế (tối đa 3 ảnh)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Dán link ảnh (https://...)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
              />
              <button
                type="button"
                onClick={handleAddImage}
                disabled={!imageUrl.trim() || images.length >= 3}
                className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-40 text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors border border-border"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>

            {images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-black/60 text-rose-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={submitting || description.length < 10}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi hồ sơ khiếu nại...</span>
              </>
            ) : (
              <>
                <span>Gửi khiếu nại tới CS</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
