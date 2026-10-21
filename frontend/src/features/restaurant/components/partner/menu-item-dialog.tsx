'use client';

import React, { useState } from 'react';
import {
  X,
  Loader2,
  Image as ImageIcon,
  Utensils,
  DollarSign,
  Tag as TagIcon,
  Layers,
  Percent,
  Sparkles,
  ArrowRight,
  Coins,
  Plus,
  Trash2,
  Check,
  Settings2,
} from 'lucide-react';
import type { PartnerMenuItem, CategoryItem, TagItem, CreateMenuItemPayload } from '@/features/restaurant/types/partner.types';
import type { MenuItemOptionGroup, MenuItemOptionChoice } from '@/features/menu/types';
import { createPartnerTag, uploadRestaurantMedia } from '@/features/restaurant/api/partner-api';

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
  tags: initialTags,
}: {
  onClose: () => void;
  onSubmit: (payload: CreateMenuItemPayload) => Promise<void>;
  initialItem?: PartnerMenuItem | null;
  categories: CategoryItem[];
  tags: TagItem[];
}) {
  const [name, setName] = useState(initialItem?.name || '');
  const [price, setPrice] = useState(initialItem?.price ? String(initialItem.price) : '');
  const [originalPrice, setOriginalPrice] = useState(initialItem?.original_price ? String(initialItem.original_price) : '');
  const [desiredNet, setDesiredNet] = useState('');
  const [showCalculator, setShowCalculator] = useState(false);
  const [description, setDescription] = useState(initialItem?.description || '');
  const [imageUrl, setImageUrl] = useState(initialItem?.image_url || '');
  const [categoryId, setCategoryId] = useState(initialItem?.category_id || categories[0]?.id || '');
  
  // Tag states
  const [tagList, setTagList] = useState<TagItem[]>(initialTags);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialItem?.tags?.map((t) => t.id) || [],
  );
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);

  // Options / Modifiers builder state
  const [options, setOptions] = useState<MenuItemOptionGroup[]>(initialItem?.options || []);
  const [showOptionsBuilder, setShowOptionsBuilder] = useState(Boolean(initialItem?.options && initialItem.options.length > 0));

  const [isAvailable, setIsAvailable] = useState(initialItem?.is_available ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);
      const res = await uploadRestaurantMedia(file, 'dishes');
      setImageUrl(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải ảnh lên S3');
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleCreateNewTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    try {
      setCreatingTag(true);
      setError(null);
      const createdTag = await createPartnerTag(trimmed);
      if (!tagList.some((t) => t.id === createdTag.id)) {
        setTagList((prev) => [...prev, createdTag]);
      }
      if (!selectedTagIds.includes(createdTag.id)) {
        setSelectedTagIds((prev) => [...prev, createdTag.id]);
      }
      setNewTagName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo tag mới');
    } finally {
      setCreatingTag(false);
    }
  };

  // Option group handlers
  const handleAddOptionGroup = (template?: 'size' | 'topping' | 'drink') => {
    setShowOptionsBuilder(true);
    const groupId = `opt-${Date.now()}`;
    let newGroup: MenuItemOptionGroup;

    if (template === 'size') {
      newGroup = {
        id: groupId,
        name: 'Chọn Kích cỡ (Size)',
        required: true,
        min_choices: 1,
        max_choices: 1,
        choices: [
          { id: `c-${Date.now()}-1`, name: 'Tô Vừa (Chuẩn)', price: 0, is_default: true },
          { id: `c-${Date.now()}-2`, name: 'Tô Lớn (+10k)', price: 10000 },
        ],
      };
    } else if (template === 'topping') {
      newGroup = {
        id: groupId,
        name: 'Thêm Topping / Món ăn kèm',
        required: false,
        min_choices: 0,
        max_choices: 5,
        choices: [
          { id: `c-${Date.now()}-1`, name: 'Thêm Bò Tái', price: 15000 },
          { id: `c-${Date.now()}-2`, name: 'Trứng Chần', price: 8000 },
          { id: `c-${Date.now()}-3`, name: 'Bò Viên (3 viên)', price: 12000 },
        ],
      };
    } else if (template === 'drink') {
      newGroup = {
        id: groupId,
        name: 'Lượng đá & Mức đường',
        required: true,
        min_choices: 1,
        max_choices: 1,
        choices: [
          { id: `c-${Date.now()}-1`, name: '100% Đá (Mát lạnh)', price: 0, is_default: true },
          { id: `c-${Date.now()}-2`, name: '50% Đá (Vừa phải)', price: 0 },
          { id: `c-${Date.now()}-3`, name: 'Để đá riêng', price: 0 },
        ],
      };
    } else {
      newGroup = {
        id: groupId,
        name: '',
        required: false,
        min_choices: 0,
        max_choices: 1,
        choices: [
          { id: `c-${Date.now()}-1`, name: '', price: 0, is_default: true },
        ],
      };
    }

    setOptions((prev) => [...prev, newGroup]);
  };

  const handleUpdateGroup = (groupId: string, field: keyof MenuItemOptionGroup, value: unknown) => {
    setOptions((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, [field]: value } : g)),
    );
  };

  const handleRemoveGroup = (groupId: string) => {
    setOptions((prev) => prev.filter((g) => g.id !== groupId));
  };

  const handleAddChoice = (groupId: string) => {
    setOptions((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const newChoice: MenuItemOptionChoice = {
          id: `c-${Date.now()}-${g.choices.length + 1}`,
          name: '',
          price: 0,
        };
        return { ...g, choices: [...g.choices, newChoice] };
      }),
    );
  };

  const handleUpdateChoice = (
    groupId: string,
    choiceId: string,
    field: keyof MenuItemOptionChoice,
    value: unknown,
  ) => {
    setOptions((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          choices: g.choices.map((c) => {
            if (c.id !== choiceId) {
              // If marking this choice as default in a single-choice group, unset others
              if (field === 'is_default' && value === true && g.max_choices === 1) {
                return { ...c, is_default: false };
              }
              return c;
            }
            return { ...c, [field]: value };
          }),
        };
      }),
    );
  };

  const handleRemoveChoice = (groupId: string, choiceId: string) => {
    setOptions((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          choices: g.choices.filter((c) => c.id !== choiceId),
        };
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = Number(price);
    const numOriginalPrice = Number(originalPrice);

    if (!name.trim()) {
      setError('Vui lòng nhập tên món ăn');
      return;
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Giá bán phải là số dương lớn hơn 0');
      return;
    }

    // Validate options builder
    if (showOptionsBuilder && options.length > 0) {
      for (const group of options) {
        if (!group.name.trim()) {
          setError('Vui lòng nhập tên cho tất cả các nhóm tùy chọn (hoặc xóa nhóm trống)');
          return;
        }
        if (group.choices.length === 0) {
          setError(`Nhóm "${group.name}" phải có ít nhất 1 lựa chọn`);
          return;
        }
        for (const choice of group.choices) {
          if (!choice.name.trim()) {
            setError(`Vui lòng nhập tên lựa chọn trong nhóm "${group.name}"`);
            return;
          }
          if (choice.price < 0) {
            setError(`Giá cộng thêm của "${choice.name}" không thể là số âm`);
            return;
          }
        }
      }
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        price: numPrice,
        original_price: !isNaN(numOriginalPrice) && numOriginalPrice > 0 ? numOriginalPrice : undefined,
        description: description.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        category_id: categoryId || undefined,
        tag_ids: selectedTagIds,
        options: showOptionsBuilder && options.length > 0 ? options : undefined,
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
    <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 p-6 shadow-2xl z-10 custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {initialItem ? 'Chỉnh sửa chi tiết món ăn' : 'Thêm món ăn mới'}
            </h2>
            <p className="text-xs text-zinc-400">
              {initialItem ? 'Cập nhật giá cả, tags đặc trưng và các tùy chọn món ăn' : 'Tùy biến thực đơn, giá bán, nhóm toppings và khẩu vị'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
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
            placeholder="VD: Phở Bò Tái Nạm, Trà Sữa Trân Châu Đường Đen..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
          />
        </div>

        {/* Hình ảnh món ăn (LocalStack S3) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
            <span>Hình ảnh món ăn (S3 Storage)</span>
            <span className="text-[11px] text-zinc-500 font-normal">Tối đa 5MB (JPG, PNG, WEBP)</span>
          </label>

          {imageUrl ? (
            <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={name || 'Dish preview'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                <label className="cursor-pointer bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl backdrop-blur-md transition-all shadow-md">
                  Đổi ảnh khác
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                    disabled={uploadingImage}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="bg-red-500/80 hover:bg-red-500 text-white text-xs font-medium px-3 py-2 rounded-xl backdrop-blur-md transition-all shadow-md"
                >
                  Xóa ảnh
                </button>
              </div>
            </div>
          ) : (
            <label className="w-full h-28 border-2 border-dashed border-white/10 hover:border-orange-500/50 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 group">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
                disabled={uploadingImage}
              />
              {uploadingImage ? (
                <div className="flex items-center gap-2 text-orange-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang tải ảnh lên S3...</span>
                </div>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-white/5 group-hover:bg-orange-500/10 text-zinc-400 group-hover:text-orange-400 flex items-center justify-center transition-colors">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-semibold text-zinc-300 group-hover:text-orange-400 transition-colors">
                      Nhấn để tải ảnh món ăn lên S3
                    </span>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Hỗ trợ PNG, JPG, WEBP dưới 5MB</p>
                  </div>
                </>
              )}
            </label>
          )}
        </div>

        {/* Giá bán & Giá gốc niêm yết */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Giá bán hiện tại (VNĐ) <span className="text-orange-500">*</span>
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                <Percent className="w-3 h-3" /> Chiết khấu sàn: 20%
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                step="1000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="55000"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm font-medium font-mono"
              />
              <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Giá gốc niêm yết (VNĐ)
              </label>
              {Number(originalPrice) > Number(price) && Number(price) > 0 && (
                <span className="text-[11px] font-extrabold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                  Giảm: -{Math.round(((Number(originalPrice) - Number(price)) / Number(originalPrice)) * 100)}%
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="Ví dụ: 65000 (Để gạch ngang)"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm font-mono"
              />
              <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            </div>
          </div>
        </div>

        {/* Danh mục */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Danh mục món ăn
          </label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-orange-500 transition-colors text-sm appearance-none cursor-pointer"
            >
              <option value="">-- Chưa chọn danh mục --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-zinc-900 text-white">
                  {cat.name}
                </option>
              ))}
            </select>
            <Layers className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Real-time Financial Breakdown for Partner */}
        {Number(price) > 0 && (
          <div className="rounded-2xl p-4 bg-zinc-900/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/5">
              <span className="text-zinc-400">🏷️ Giá khách hàng thanh toán:</span>
              <span className="font-mono font-semibold text-zinc-200">
                {Number(price).toLocaleString('vi-VN')} ₫
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-white/5">
              <span className="text-zinc-400">✂️ Phí chiết khấu ứng dụng (20%):</span>
              <span className="font-mono font-semibold text-red-400">
                -{Math.round(Number(price) * 0.2).toLocaleString('vi-VN')} ₫
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Quán thực nhận (80%):</span>
              </span>
              <span className="font-mono font-extrabold text-sm text-emerald-400">
                +{Math.round(Number(price) * 0.8).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>
        )}

        {/* Suggestion Tool: Set Price by Desired Income */}
        <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-3.5">
          <button
            type="button"
            onClick={() => setShowCalculator(!showCalculator)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Công cụ định giá: Bạn muốn thu về bao nhiêu thực nhận?</span>
            </span>
            <span className="text-[11px] underline">
              {showCalculator ? 'Thu gọn' : 'Mở công cụ'}
            </span>
          </button>

          {showCalculator && (
            <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-2.5">
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Nhập số tiền bạn muốn thực nhận sau khi trừ chiết khấu sàn 20%, hệ thống sẽ tự tính giá bán cần niêm yết:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={desiredNet}
                    onChange={(e) => setDesiredNet(e.target.value)}
                    placeholder="VD: 40000 (Mong muốn thu về)"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-amber-500 transition-colors font-mono"
                  />
                  <Coins className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                </div>

                {Number(desiredNet) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const net = Number(desiredNet);
                      if (net > 0) {
                        const calculated = Math.ceil((net / 0.8) / 1000) * 1000;
                        setPrice(String(calculated));
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer"
                  >
                    <span>Áp dụng giá: {Math.ceil((Number(desiredNet) / 0.8) / 1000 * 1000).toLocaleString('vi-VN')} ₫</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tags Section with Dynamic Tag Creation */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-orange-400" />
              Gắn nhãn đặc trưng cho món (Tags từ DB)
            </label>
            <span className="text-[11px] text-zinc-500">
              Đã chọn: {selectedTagIds.length} nhãn
            </span>
          </div>

          <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 custom-scrollbar">
            {tagList.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  <span>#{tag.name}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Create Custom Tag */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateNewTag();
                }
              }}
              placeholder="Thêm tag mới (VD: Giòn tan, Ít béo, Gia truyền...)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleCreateNewTag}
              disabled={creatingTag || !newTagName.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            >
              {creatingTag ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Thêm tag</span>
            </button>
          </div>
        </div>

        {/* Options & Modifiers Builder */}
        <div className="space-y-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-orange-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Tùy chọn & Toppings món ăn ({options.length} nhóm)
              </label>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionsBuilder(!showOptionsBuilder)}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium underline cursor-pointer"
            >
              {showOptionsBuilder ? 'Ẩn cấu hình' : 'Hiện cấu hình'}
            </button>
          </div>

          {showOptionsBuilder && (
            <div className="space-y-4 bg-zinc-900/40 p-4 rounded-2xl border border-white/5">
              {/* Template Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-zinc-500 font-medium">Mẫu nhanh:</span>
                <button
                  type="button"
                  onClick={() => handleAddOptionGroup('size')}
                  className="px-2.5 py-1 rounded-lg text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all cursor-pointer"
                >
                  + Nhóm Kích cỡ (Size)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOptionGroup('topping')}
                  className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all cursor-pointer"
                >
                  + Nhóm Topping thêm
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOptionGroup('drink')}
                  className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                >
                  + Nhóm Đá / Đường
                </button>
                <button
                  type="button"
                  onClick={() => handleAddOptionGroup()}
                  className="px-2.5 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all cursor-pointer"
                >
                  + Nhóm Tùy chỉnh khác
                </button>
              </div>

              {/* Groups List */}
              {options.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic border border-dashed border-white/10 rounded-xl">
                  Món ăn hiện chưa có nhóm tùy chọn nào. Bấm vào các nút mẫu trên để thêm Size hoặc Topping cho món.
                </div>
              ) : (
                <div className="space-y-4">
                  {options.map((group, gIdx) => (
                    <div
                      key={group.id}
                      className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5">
                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            required
                            value={group.name}
                            onChange={(e) => handleUpdateGroup(group.id, 'name', e.target.value)}
                            placeholder="Tên nhóm (VD: Chọn Kích cỡ, Topping thêm...)"
                            className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={group.required}
                              onChange={(e) => handleUpdateGroup(group.id, 'required', e.target.checked)}
                              className="rounded border-zinc-700 text-orange-500 focus:ring-0"
                            />
                            <span>Bắt buộc chọn</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveGroup(group.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Xóa nhóm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Choices inside group */}
                      <div className="space-y-2">
                        <div className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider flex items-center justify-between px-1">
                          <span>Các lựa chọn trong nhóm:</span>
                          <span className="text-[10px] text-zinc-500">Tối đa lựa chọn: {group.max_choices || 1}</span>
                        </div>

                        {group.choices.map((choice) => (
                          <div key={choice.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              value={choice.name}
                              onChange={(e) => handleUpdateChoice(group.id, choice.id, 'name', e.target.value)}
                              placeholder="Tên lựa chọn (VD: Tô Lớn, Thêm Bò Viên...)"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                            />
                            <div className="w-28 relative">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={choice.price}
                                onChange={(e) => handleUpdateChoice(group.id, choice.id, 'price', Number(e.target.value))}
                                placeholder="+0đ"
                                className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-zinc-950 border border-white/10 text-xs font-mono text-orange-400 focus:outline-none focus:border-orange-500"
                              />
                              <span className="text-[10px] text-zinc-500 absolute left-2 top-2">+</span>
                            </div>
                            <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={Boolean(choice.is_default)}
                                onChange={(e) => handleUpdateChoice(group.id, choice.id, 'is_default', e.target.checked)}
                                className="rounded border-zinc-700 text-orange-500 focus:ring-0"
                              />
                              <span>Mặc định</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveChoice(group.id, choice.id)}
                              disabled={group.choices.length <= 1}
                              className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-20 cursor-pointer"
                              title="Xóa lựa chọn"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => handleAddChoice(group.id)}
                          className="mt-1 text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer pt-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm lựa chọn vào nhóm {gIdx + 1}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ảnh URL */}
        <div className="space-y-1.5 pt-2 border-t border-white/10">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Hình ảnh món ăn (URL)
          </label>
          <div className="relative">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm"
            />
            <ImageIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>
        </div>

        {/* Mô tả */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Mô tả ngắn & Hương vị
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="VD: Thịt bò tươi tái mềm, nước dùng ninh từ xương ống thảo quả thơm lừng..."
            className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors text-sm resize-none"
          />
        </div>

        {/* Switch Trạng thái còn hàng */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-white/10">
          <div>
            <p className="text-sm font-semibold text-white">Trạng thái bán</p>
            <p className="text-xs text-zinc-400">
              {isAvailable ? 'Món đang còn hàng và sẵn sàng nhận đơn' : 'Tạm hết món (khách hàng không thể thêm vào giỏ)'}
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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg shadow-orange-500/25 disabled:opacity-50 transition-all duration-200 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {initialItem ? 'Lưu thay đổi' : 'Thêm món vào thực đơn'}
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
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      <MenuItemDialogContent
        onClose={onClose}
        onSubmit={onSubmit}
        initialItem={initialItem}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
