'use client';

import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, MapPin, X, ZoomIn } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface DeliveryProofItem {
  id: string;
  orderId: string;
  driverId: string;
  proofType: 'PICKED_UP' | 'DELIVERED';
  imageUrl: string;
  capturedLat: number;
  capturedLng: number;
  notes: string | null;
  createdAt: string | Date;
}

interface OrderDeliveryProofCardProps {
  orderId: string;
  isCompleted: boolean;
}

export function OrderDeliveryProofCard({ orderId, isCompleted }: OrderDeliveryProofCardProps) {
  const [proofs, setProofs] = useState<DeliveryProofItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isCompleted || !orderId) return;

    let isMounted = true;

    apiClient<DeliveryProofItem[]>(`/delivery/orders/${orderId}/proof`)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setProofs(data);
        }
      })
      .catch(() => {
        // Silent catch for resilience
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [orderId, isCompleted]);

  if (!isCompleted || loading || proofs.length === 0) {
    return null;
  }

  const deliveredProof = proofs.find((p) => p.proofType === 'DELIVERED') || proofs[0];

  return (
    <>
      <div className="rounded-2xl bg-zinc-900/80 border border-emerald-500/20 p-5 shadow-lg shadow-black/20 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span>Bằng chứng giao hàng của tài xế</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                  Đã xác thực
                </span>
              </h4>
              <p className="text-xs text-zinc-400">
                Ảnh chụp gói hàng tại điểm bàn giao lúc{' '}
                {new Date(deliveredProof.createdAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLightboxUrl(deliveredProof.imageUrl)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-200 border border-white/10 transition cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Xem phóng to</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Thumbnail preview */}
          <div
            onClick={() => setLightboxUrl(deliveredProof.imageUrl)}
            className="relative w-full sm:w-44 h-32 rounded-xl overflow-hidden border border-white/10 bg-black cursor-pointer group shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={deliveredProof.imageUrl}
              alt="Ảnh bằng chứng giao hàng"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ZoomIn className="w-6 h-6 drop-shadow-md" />
            </div>
          </div>

          {/* Details & Notes */}
          <div className="flex-1 space-y-2 text-xs">
            {deliveredProof.notes && (
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-zinc-300">
                <span className="text-zinc-500 font-semibold block mb-0.5">Ghi chú của tài xế:</span>
                <p className="italic text-zinc-200">&ldquo;{deliveredProof.notes}&rdquo;</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-zinc-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Tọa độ GPS bàn giao: {deliveredProof.capturedLat.toFixed(5)},{' '}
                {deliveredProof.capturedLng.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-zinc-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-zinc-950">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Ảnh chụp bằng chứng giao hàng thực tế</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxUrl(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt="Bằng chứng giao hàng đầy đủ"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
