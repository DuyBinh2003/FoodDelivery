'use client';

import { useState } from 'react';
import { X, Loader2, Image as ImageIcon, Utensils, DollarSign, Tag as TagIcon, Layers } from 'lucide-react';
import type { PartnerMenuItem, CategoryItem, TagItem, CreateMenuItemPayload } from '@/features/restaurant/types/partner.types';

interface MenuItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateMenuItemPayload) => Promise<void>;
  initialItem?: PartnerMenuItem | null;
  categories: CategoryItem[];
  tags: TagItem[];
}

function MenuItemDialogContent({
  onClose,
  onSubmit,
  initialItem,
  categories,
  tags,
}: {
  onClose: () => void;
  onSubmit: (payload: CreateMenuItemPayload) => Promise<void>;
  initialItem?: PartnerMenuItem | null;
  categories: CategoryItem[];
  tags: TagItem[];
}) {
  const [name, setName] = useState(initialItem?.name || '');
  const [price, setPrice] = useState(initialItem?.price ? String(initialItem.price) : '');
  const [description, setDescription] = useState(initialItem?.description || '');
  const [imageUrl, setImageUrl] = useState(initialItem?.image_url || '');
  const [categoryId, setCategoryId] = useState(initialItem?.category_id || categories[0]?.id || '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialItem?.tags?.map((t) => t.id) || [],
  );
  const [isAvailable, setIsAvailable] = useState(initialItem?.is_available ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(price);
    if (!name.trim()) {
      setError('Vui lòng nhập tên món ăn');
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Giá bán phải là số dương lớn hơn 0');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        price: numPrice,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        category_id: categoryId || undefined,
        tag_ids: selectedTagIds,
        is_available: isAvailable,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu món ăn');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl z-10 custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {initialItem ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
            </h2>
            <p className="text-xs text-zinc-400">
              {initialItem ? 'Cập nhật giá cả, trạng thái và mô tả món' : 'Thêm món vào thực đơn quán của bạn'}
            </p>
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
        {/* Tên món */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Tên món ăn <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Phở Bò Tái Nạm, Trà Sữa Trân Châu..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
          />
        </div>

        {/* Giá bán & Danh mục */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Giá bán (VNĐ) <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                step="1000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="55000"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
              />
              <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Danh mục món ăn
            </label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm appearance-none"
              >
                <option value="">-- Chưa chọn danh mục --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-zinc-800 text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
              <Layers className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            <span className="flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-orange-400" />
              Gắn nhãn đặc trưng (Tags)
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-zinc-800/90 text-zinc-400 hover:text-white hover:bg-zinc-700/80 border border-white/5'
                  }`}
                >
                  #{tag.name}
                </button>
              );
            })}
            {tags.length === 0 && (
              <span className="text-xs text-zinc-500">Chưa có nhãn tag nào trong hệ thống</span>
            )}
          </div>
        </div>

        {/* Ảnh URL */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Hình ảnh món ăn (URL)
          </label>
          <div className="relative">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <ImageIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>
        </div>

        {/* Mô tả */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Mô tả ngắn
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Thịt bò tươi tái chín, hành hoa, nước dùng ninh từ xương ống thơm lừng..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800/80 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
          />
        </div>

        {/* Switch Trạng thái còn hàng */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/60 border border-white/5">
          <div>
            <p className="text-sm font-semibold text-white">Trạng thái bán</p>
            <p className="text-xs text-zinc-400">
              {isAvailable ? 'Món đang còn hàng và sẵn sàng phục vụ' : 'Tạm hết món (khách hàng không thể thêm vào giỏ)'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
          </label>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
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
            {initialItem ? 'Lưu thay đổi' : 'Thêm món'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function MenuItemDialog({
  isOpen,
  onClose,
  onSubmit,
  initialItem,
  categories,
  tags,
}: MenuItemDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <MenuItemDialogContent
        key={initialItem?.id || 'new'}
        onClose={onClose}
        onSubmit={onSubmit}
        initialItem={initialItem}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
