'use client';

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, CheckCircle2, Loader2, MapPin } from 'lucide-react';
import { uploadDeliveryProofPhoto, submitDeliveryProof } from '@/features/driver/api/driver-api';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  driverId: string;
  dropoffAddress: string;
  onSuccess: () => Promise<void>;
}

export function ProofOfDeliveryModal({
  isOpen,
  onClose,
  orderId,
  driverId,
  dropoffAddress,
  onSuccess,
}: ProofOfDeliveryModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn file hình ảnh (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Dung lượng ảnh không được vượt quá 5MB');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setErrorMsg('Vui lòng chụp hoặc tải lên ảnh bằng chứng giao hàng');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      // 1. Lấy tọa độ GPS hiện tại của tài xế
      let lat = 10.7769;
      let lng = 106.7009;

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 6000,
              maximumAge: 10000,
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch {
          // Fallback nếu người dùng chặn định vị trình duyệt
        }
      }

      // 2. Upload ảnh lên S3
      const { url: imageUrl } = await uploadDeliveryProofPhoto(orderId, selectedFile);

      // 3. Ghi nhận bản ghi bằng chứng giao hàng
      await submitDeliveryProof(orderId, {
        driver_id: driverId,
        proof_type: 'DELIVERED',
        image_url: imageUrl,
        captured_lat: lat,
        captured_lng: lng,
        notes: notes.trim() || undefined,
      });

      // 4. Trigger hoàn tất đơn hàng
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi bằng chứng giao hàng';
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Bằng Chứng Giao Hàng (POD)</h3>
              <p className="text-xs text-zinc-400">Đơn hàng #{orderId.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Dropoff location hint */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200 block">Điểm giao khách:</span>
              <span className="text-zinc-400 line-clamp-2">{dropoffAddress}</span>
            </div>
          </div>

          {/* Photo capture area */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Ảnh chụp bàn giao món ăn <span className="text-rose-400">*</span>
            </label>

            {previewUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Proof of delivery preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  disabled={uploading}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-zinc-300 hover:text-white hover:bg-black transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Đã tải ảnh ({((selectedFile?.size || 0) / 1024).toFixed(0)} KB)
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-500/40 cursor-pointer transition"
              >
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-zinc-200 mb-0.5">Chụp ảnh hoặc Chọn từ thư viện</p>
                <p className="text-[11px] text-zinc-500">Chụp rõ gói hàng trước cửa hoặc biển số nhà</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Ghi chú thêm (Tùy chọn)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={uploading}
              placeholder="VD: Gửi bảo vệ toà nhà, trao tận tay..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10 bg-zinc-950/30">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={uploading || !selectedFile}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang gửi bằng chứng...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Gửi bằng chứng & Hoàn tất</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
