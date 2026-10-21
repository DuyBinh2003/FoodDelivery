'use client';

import { useState } from 'react';
import { X, Loader2, Store, MapPin, Layers, Image as ImageIcon } from 'lucide-react';
import type { PartnerRestaurant, CategoryItem, UpdateRestaurantProfilePayload } from '@/features/restaurant/types/partner.types';
import { uploadRestaurantMedia } from '@/features/restaurant/api/partner-api';

interface RestaurantProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateRestaurantProfilePayload) => Promise<void>;
  restaurant: PartnerRestaurant;
  availableCategories: CategoryItem[];
}

function RestaurantProfileDialogContent({
  onClose,
  onSubmit,
  restaurant,
  availableCategories,
}: {
  onClose: () => void;
  onSubmit: (payload: UpdateRestaurantProfilePayload) => Promise<void>;
  restaurant: PartnerRestaurant;
  availableCategories: CategoryItem[];
}) {
  const [name, setName] = useState(restaurant.name || '');
  const [address, setAddress] = useState(restaurant.address || '');
  const [bannerUrl, setBannerUrl] = useState(restaurant.banner_url || '');
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    restaurant.categories?.map((c) => c.id) || [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setUploadingBanner(true);
      setError(null);
      const res = await uploadRestaurantMedia(file, 'banners');
      setBannerUrl(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải banner lên S3');
    } finally {
      setUploadingBanner(false);
    }
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhà hàng');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        address: address.trim() || undefined,
        category_ids: selectedCategoryIds,
        banner_url: bannerUrl || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật hồ sơ quán');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Chỉnh sửa thông tin quán</h2>
            <p className="text-xs text-zinc-400">Cập nhật tên quán, địa chỉ và thể loại ẩm thực</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Tên nhà hàng */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Tên nhà hàng <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Phở Gia Truyền Bát Đàn..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <Store className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>
        </div>

        {/* Địa chỉ */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Địa chỉ kinh doanh
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="VD: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>
        </div>

        {/* Ảnh Banner nhà hàng (LocalStack S3) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
            <span>Ảnh bìa / Banner nhà hàng (S3)</span>
            <span className="text-[11px] text-zinc-500 font-normal">Tối đa 5MB</span>
          </label>

          {bannerUrl ? (
            <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-zinc-800 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bannerUrl}
                alt="Restaurant Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-md transition-all shadow-md">
                  Đổi banner
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerFileChange}
                    disabled={uploadingBanner}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setBannerUrl('')}
                  className="bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg backdrop-blur-md transition-all shadow-md"
                >
                  Xóa banner
                </button>
              </div>
            </div>
          ) : (
            <label className="w-full h-24 border-2 border-dashed border-white/10 hover:border-orange-500/50 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBannerFileChange}
                disabled={uploadingBanner}
              />
              {uploadingBanner ? (
                <div className="flex items-center gap-2 text-orange-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải banner lên S3...</span>
                </div>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 text-zinc-400 group-hover:text-orange-400 transition-colors" />
                  <span className="text-xs text-zinc-300 group-hover:text-orange-400 transition-colors">
                    Tải ảnh bìa quán ăn lên S3
                  </span>
                </>
              )}
            </label>
          )}
        </div>

        {/* Danh mục ẩm thực */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-orange-400" />
              Thể loại ẩm thực của quán (Chọn một hoặc nhiều)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => {
              const isSelected = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-zinc-800/90 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border border-white/5'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all duration-200"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu thông tin
          </button>
        </div>
      </form>
    </div>
  );
}

export function RestaurantProfileDialog({
  isOpen,
  onClose,
  onSubmit,
  restaurant,
  availableCategories,
}: RestaurantProfileDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <RestaurantProfileDialogContent
        key={restaurant.id}
        onClose={onClose}
        onSubmit={onSubmit}
        restaurant={restaurant}
        availableCategories={availableCategories}
      />
    </div>
  );
}
