'use client';

import React, { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Star, X, ImagePlus, UploadCloud, Loader2, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import { useCreateOrderReview } from '@/features/orders/hooks/useCreateOrderReview';
import { uploadOrderReviewImage } from '@/features/orders/api/order-api';
import {
  MAX_REVIEW_IMAGES,
  REVIEW_RATING_LABELS,
  validateReviewImageFile,
  checkImageLimit,
  buildReviewPayload,
} from '@/features/orders/utils/review.utils';
import { Button } from '@/components/ui/button';

interface OrderReviewModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ImageUploadItem {
  id: string;
  previewUrl: string;
  s3Url?: string;
  isUploading: boolean;
  error?: string;
}

const StarRating = ({
  rating,
  setRating,
  label,
}: {
  rating: number;
  setRating: (val: number) => void;
  label: string;
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const currentRating = hoverRating ?? rating;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-zinc-950/60 border border-white/5 transition-colors hover:border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        <span className="text-xs font-semibold text-orange-400 min-h-[1rem]">
          {currentRating > 0 ? REVIEW_RATING_LABELS[currentRating] : 'Chưa chọn'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= currentRating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-1 rounded-lg transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                aria-label={`${label} ${star} sao`}
              >
                <Star
                  className={`w-7 h-7 transition-all ${
                    isFilled
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]'
                      : 'text-zinc-700 hover:text-zinc-500'
                  }`}
                />
              </button>
            );
          })}
        </div>
        {rating > 0 && (
          <span className="text-xs text-zinc-400 font-mono">({rating}/5)</span>
        )}
      </div>
    </div>
  );
};

export const OrderReviewModal = ({ orderId, isOpen, onClose }: OrderReviewModalProps) => {
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [comment, setComment] = useState('');
  const [uploadedImages, setUploadedImages] = useState<ImageUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const createReview = useCreateOrderReview(orderId);

  const resetForm = useCallback(() => {
    setRestaurantRating(0);
    setDriverRating(0);
    setFoodRating(0);
    setComment('');
    setUploadedImages([]);
    setIsDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleFileSelection = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const limitCheck = checkImageLimit(uploadedImages.length, fileList.length, MAX_REVIEW_IMAGES);

    if (!limitCheck.allowed || limitCheck.canAddCount <= 0) {
      toast.error(`Bạn chỉ có thể tải lên tối đa ${MAX_REVIEW_IMAGES} hình ảnh.`);
      return;
    }

    if (limitCheck.excessCount > 0) {
      toast.error(`Đã bỏ qua ${limitCheck.excessCount} tệp do vượt quá giới hạn ${MAX_REVIEW_IMAGES} ảnh.`);
    }

    const filesToUpload = fileList.slice(0, limitCheck.canAddCount);

    for (const file of filesToUpload) {
      const validation = validateReviewImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || `Tệp "${file.name}" không hợp lệ.`);
        continue;
      }

      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const localPreviewUrl = URL.createObjectURL(file);

      const newItem: ImageUploadItem = {
        id: tempId,
        previewUrl: localPreviewUrl,
        isUploading: true,
      };

      setUploadedImages((prev) => [...prev, newItem]);

      try {
        const response = await uploadOrderReviewImage(file);
        if (response.success && response.url) {
          setUploadedImages((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? { ...item, s3Url: response.url, isUploading: false }
                : item,
            ),
          );
        } else {
          throw new Error('Không nhận được URL từ máy chủ');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Tải ảnh lên S3 thất bại';
        toast.error(`Lỗi tải ảnh "${file.name}": ${message}`);
        setUploadedImages((prev) => prev.filter((item) => item.id !== tempId));
        URL.revokeObjectURL(localPreviewUrl);
      }
    }
  }, [uploadedImages.length]);

  const handleRemoveImage = useCallback((id: string) => {
    setUploadedImages((prev) => {
      const itemToRemove = prev.find((item) => item.id === id);
      if (itemToRemove?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(itemToRemove.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFileSelection(e.dataTransfer.files);
    }
  }, [handleFileSelection]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const isAnyUploading = uploadedImages.some((img) => img.isUploading);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAnyUploading) {
      toast.error('Vui lòng đợi ảnh tải lên hoàn tất trước khi gửi đánh giá.');
      return;
    }

    const s3ImageUrls = uploadedImages
      .map((item) => item.s3Url)
      .filter((url): url is string => Boolean(url));

    const { payload, error } = buildReviewPayload({
      restaurantRating,
      foodRating,
      driverRating,
      comment,
      imageUrls: s3ImageUrls,
    });

    if (!payload || error) {
      toast.error(error || 'Vui lòng chọn số sao hoặc nhập nhận xét đánh giá.');
      return;
    }

    createReview.mutate(payload, {
      onSuccess: () => {
        toast.success('Cảm ơn bạn đã gửi đánh giá đơn hàng!');
        handleClose();
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : 'Gửi đánh giá thất bại. Vui lòng thử lại sau.';
        toast.error(message);
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="w-full max-w-xl bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-950">
          <div>
            <h2 id="review-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              Đánh giá đơn hàng
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Mã đơn: <span className="font-mono text-zinc-300">#{orderId.slice(0, 8)}</span> • Chia sẻ trải nghiệm để nâng cao chất lượng dịch vụ
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ratings Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Chấm điểm chất lượng
            </h3>
            <div className="grid gap-3">
              <StarRating
                rating={restaurantRating}
                setRating={setRestaurantRating}
                label="Nhà hàng & Đóng gói"
              />
              <StarRating
                rating={foodRating}
                setRating={setFoodRating}
                label="Hương vị món ăn"
              />
              <StarRating
                rating={driverRating}
                setRating={setDriverRating}
                label="Thái độ & Tốc độ tài xế"
              />
            </div>
          </div>

          {/* Comment Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="review-comment" className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-orange-400" />
                Nhận xét chi tiết
              </label>
              <span className="text-xs text-zinc-500 font-mono">
                {comment.length}/1000 ký tự
              </span>
            </div>
            <textarea
              id="review-comment"
              rows={3}
              maxLength={1000}
              className="w-full p-3.5 bg-zinc-950/80 border border-white/10 text-white rounded-xl resize-none placeholder:text-zinc-600 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all text-sm"
              placeholder="Món ăn có chuẩn vị không? Bao bì đóng gói thế nào? Tài xế giao nhanh không?..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                <ImagePlus className="w-4 h-4 text-orange-400" />
                Hình ảnh thực tế
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                {uploadedImages.length}/{MAX_REVIEW_IMAGES} ảnh (Lưu trữ S3)
              </span>
            </div>

            {/* Hidden Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileSelection(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            {/* Dropzone */}
            {uploadedImages.length < MAX_REVIEW_IMAGES && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-orange-500 bg-orange-500/10 scale-[1.01]'
                    : 'border-white/15 bg-zinc-950/40 hover:bg-zinc-950/80 hover:border-white/30'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 mb-2">
                  <UploadCloud className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-sm font-medium text-zinc-200 text-center">
                  Nhấp hoặc kéo thả ảnh món ăn vào đây
                </p>
                <p className="text-xs text-zinc-500 text-center mt-1">
                  Định dạng JPEG, PNG, WEBP • Tối đa 5MB mỗi ảnh
                </p>
              </div>
            )}

            {/* Uploaded Images Preview Grid */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-5 gap-3 pt-1">
                {uploadedImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-950 shadow-inner"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.previewUrl}
                      alt="Review attachment preview"
                      className={`w-full h-full object-cover transition-transform duration-200 group-hover:scale-105 ${
                        img.isUploading ? 'opacity-40 filter blur-[1px]' : 'opacity-100'
                      }`}
                    />

                    {/* Loading Overlay */}
                    {img.isUploading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 p-1">
                        <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                        <span className="text-[10px] text-zinc-300 font-medium mt-1">Đang tải...</span>
                      </div>
                    )}

                    {/* Delete Action Button */}
                    {!img.isUploading && (
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(img.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-zinc-300 hover:text-white hover:bg-red-600 transition-colors backdrop-blur-sm"
                        title="Xóa ảnh này"
                        aria-label="Xóa ảnh"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guide Hint */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300/90">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
            <span>
              Đánh giá của bạn sẽ được hiển thị công khai trên trang nhà hàng và đóng góp vào điểm chất lượng cho tài xế giao hàng.
            </span>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createReview.isPending}
              className="border-white/10 text-zinc-300 hover:text-white hover:bg-white/10"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              disabled={createReview.isPending || isAnyUploading}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium shadow-lg shadow-orange-500/20 transition-all border-0"
            >
              {createReview.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang gửi đánh giá...
                </>
              ) : isAnyUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tải ảnh lên S3...
                </>
              ) : (
                'Gửi đánh giá'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
