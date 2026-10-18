'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Store,
  MapPin,
  Star,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UtensilsCrossed,
  ArrowRight,
  ChefHat,
} from 'lucide-react';
import {
  getMyRestaurant,
  updateRestaurantStatus,
  updateRestaurantProfile,
  createPartnerMenuItem,
  updatePartnerMenuItem,
  deletePartnerMenuItem,
  getAvailableCategories,
  getAvailableTags,
} from '@/features/restaurant/api/partner-api';
import type {
  PartnerRestaurant,
  PartnerMenuItem,
  CategoryItem,
  TagItem,
  CreateMenuItemPayload,
  UpdateRestaurantProfilePayload,
} from '@/features/restaurant/types/partner.types';
import { MenuItemDialog } from '@/features/restaurant/components/partner/menu-item-dialog';
import { RestaurantProfileDialog } from '@/features/restaurant/components/partner/restaurant-profile-dialog';
import { KitchenOrdersTab } from '@/features/restaurant/components/partner/kitchen-orders-tab';
import { FoodItemDetailDialog } from '@/features/restaurant/components/partner/food-item-detail-dialog';

export function PartnerDashboard() {
  const [restaurant, setRestaurant] = useState<PartnerRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<PartnerMenuItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusToggling, setStatusToggling] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modals state
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PartnerMenuItem | null>(null);
  const [viewingMenuItem, setViewingMenuItem] = useState<PartnerMenuItem | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('orders');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resData, catsData, tagsData] = await Promise.all([
        getMyRestaurant().catch(() => null),
        getAvailableCategories().catch(() => []),
        getAvailableTags().catch(() => []),
      ]);

      if (!resData) {
        setRestaurant(null);
        setMenuItems([]);
      } else {
        setRestaurant(resData.restaurant);
        setMenuItems(resData.menuItems || []);
      }

      setCategories(catsData);
      setTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [resData, catsData, tagsData] = await Promise.all([
          getMyRestaurant().catch(() => null),
          getAvailableCategories().catch(() => []),
          getAvailableTags().catch(() => []),
        ]);
        if (!isMounted) return;
        if (!resData) {
          setRestaurant(null);
          setMenuItems([]);
        } else {
          setRestaurant(resData.restaurant);
          setMenuItems(resData.menuItems || []);
        }
        setCategories(catsData);
        setTags(tagsData);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Toggle restaurant active status
  const handleToggleStatus = async () => {
    if (!restaurant || statusToggling) return;
    const nextStatus = !restaurant.is_active;

    try {
      setStatusToggling(true);
      const updated = await updateRestaurantStatus(nextStatus);
      setRestaurant(updated);
      showToast(
        'success',
        nextStatus
          ? 'Quán đã MỞ CỬA nhận đơn! Khách hàng có thể tìm và đặt món.'
          : 'Quán đã TẠM ĐÓNG CỬA. Hệ thống sẽ từ chối đơn hàng mới.',
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Không thể cập nhật trạng thái quán');
    } finally {
      setStatusToggling(false);
    }
  };

  // Quick toggle menu item availability
  const handleToggleItemAvailability = async (item: PartnerMenuItem) => {
    try {
      const nextAvailable = !item.is_available;
      const updated = await updatePartnerMenuItem(item.id, { is_available: nextAvailable });
      setMenuItems((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
      setViewingMenuItem((prev) => (prev && prev.id === item.id ? updated : prev));
      showToast(
        'success',
        `Món "${item.name}" đã chuyển sang ${nextAvailable ? 'Còn món' : 'Hết món'}`,
      );
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Không thể cập nhật món ăn');
    }
  };

  // Save dish (create or update)
  const handleSaveMenuItem = async (payload: CreateMenuItemPayload) => {
    if (editingItem) {
      const updated = await updatePartnerMenuItem(editingItem.id, payload);
      setMenuItems((prev) => prev.map((m) => (m.id === editingItem.id ? updated : m)));
      showToast('success', `Đã cập nhật món "${updated.name}"`);
    } else {
      const created = await createPartnerMenuItem(payload);
      setMenuItems((prev) => [created, ...prev]);
      showToast('success', `Đã thêm món "${created.name}" vào thực đơn`);
    }
  };

  // Delete dish
  const handleDeleteMenuItem = async (itemId: string) => {
    try {
      await deletePartnerMenuItem(itemId);
      setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
      showToast('success', 'Đã xóa món ăn khỏi thực đơn');
      setDeletingItemId(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Không thể xóa món ăn');
    }
  };

  // Update profile
  const handleUpdateProfile = async (payload: UpdateRestaurantProfilePayload) => {
    const updated = await updateRestaurantProfile(payload);
    setRestaurant(updated);
    showToast('success', 'Đã cập nhật thông tin nhà hàng thành công');
  };

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === 'ALL' || item.category_id === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, selectedCategoryFilter]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Đang tải thông tin quán ăn của bạn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">Đã xảy ra lỗi khi tải dữ liệu</h3>
          <p className="text-sm text-zinc-400 mb-6">{error}</p>
          <button
            onClick={() => loadData()}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  // If user does not have a registered / approved restaurant
  if (!restaurant) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-orange-500">
            <Store className="w-10 h-10" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Bạn chưa có nhà hàng được kích hoạt
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-8 text-sm sm:text-base">
            Nếu bạn đã gửi yêu cầu đăng ký mở quán, vui lòng chờ Ban quản trị phê duyệt. Sau khi được duyệt, bạn sẽ có thể quản lý thực đơn, đặt giá bán và mở cửa nhận đơn tại đây.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register/restaurant"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25 transition-all"
            >
              <span>Đăng ký mở quán ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/menu"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              Khám phá thực đơn
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeDishesCount = menuItems.filter((i) => i.is_available).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/90 border-red-500/30 text-red-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner & Online/Offline Status Bar */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
            restaurant.is_active ? 'bg-emerald-500/15' : 'bg-amber-500/15'
          }`}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Restaurant identity */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {restaurant.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đối tác đã duyệt
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-400" />
                {restaurant.address || 'Chưa cập nhật địa chỉ'}
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <Star className="w-4 h-4 fill-amber-400" />
                {restaurant.rating || 5.0} (Đánh giá)
              </span>
            </div>

            {/* Categories tags */}
            {restaurant.categories && restaurant.categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {restaurant.categories.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-zinc-300 border border-white/5"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick status switch & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-white/10">
            {/* Big Status Switch */}
            <div
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between sm:justify-start gap-5 ${
                restaurant.is_active
                  ? 'bg-emerald-950/30 border-emerald-500/30'
                  : 'bg-amber-950/30 border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3.5 h-3.5 rounded-full animate-pulse ${
                    restaurant.is_active ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <p className="text-sm font-bold text-white">
                    {restaurant.is_active ? 'ĐANG MỞ CỬA NHẬN ĐƠN' : 'TẠM ĐÓNG CỬA'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {restaurant.is_active
                      ? 'Khách hàng có thể đặt món trực tiếp'
                      : 'Hệ thống đang ngưng nhận đơn hàng'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={statusToggling}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  restaurant.is_active ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    restaurant.is_active ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-sm font-medium text-zinc-300 hover:text-white border border-white/10 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Sửa thông tin quán</span>
            </button>
          </div>
        </div>

        {/* Stats summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="p-4 rounded-2xl bg-zinc-800/40 border border-white/5">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Tổng món</span>
            <p className="text-2xl font-bold text-white mt-1">{menuItems.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-800/40 border border-white/5">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Đang mở bán</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{activeDishesCount}</p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-800/40 border border-white/5">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Tạm hết món</span>
            <p className="text-2xl font-bold text-zinc-400 mt-1">
              {menuItems.length - activeDishesCount}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-800/40 border border-white/5">
            <span className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Trạng thái</span>
            <p
              className={`text-base font-bold mt-2 flex items-center gap-1.5 ${
                restaurant.is_active ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <Power className="w-4 h-4" />
              {restaurant.is_active ? 'Đang nhận đơn' : 'Nghỉ bán'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Bếp & Quản lý đơn hàng</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/25'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          <span>Thực đơn & Món ăn ({menuItems.length})</span>
        </button>
      </div>

      {activeTab === 'orders' ? (
        <KitchenOrdersTab
          restaurantId={restaurant.id}
          showToast={showToast}
          menuItems={menuItems}
        />
      ) : (
        /* Menu Management Section */
        <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Quản lý thực đơn món ăn</h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Điều chỉnh giá cả, bật/tắt còn món, gán tag và danh mục món ăn
            </p>
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsMenuModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm món mới</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên món ăn..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              Tất cả ({menuItems.length})
            </button>
            {categories.map((cat) => {
              const count = menuItems.filter((m) => m.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Food Items Grid */}
        {filteredMenuItems.length === 0 ? (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-12 text-center">
            <UtensilsCrossed className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-white font-medium">Không tìm thấy món ăn phù hợp</p>
            <p className="text-zinc-500 text-xs mt-1">
              {searchQuery ? 'Thử tìm với từ khóa khác' : 'Bấm "+ Thêm món mới" để bắt đầu xây dựng thực đơn'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMenuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setViewingMenuItem(item)}
                className={`group bg-zinc-900 border rounded-2xl p-4 shadow-lg transition-all flex flex-col justify-between cursor-pointer ${
                  item.is_available
                    ? 'border-white/10 hover:border-orange-500/50 hover:shadow-orange-500/10'
                    : 'border-white/5 opacity-70 bg-zinc-900/50'
                }`}
              >
                <div className="space-y-3">
                  {/* Image & Price banner */}
                  <div className="relative h-40 w-full rounded-xl overflow-hidden bg-zinc-800">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                        <UtensilsCrossed className="w-8 h-8 mb-1" />
                        <span className="text-xs">Chưa có ảnh</span>
                      </div>
                    )}

                    {/* Category badge */}
                    {item.category && (
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/70 backdrop-blur-md text-orange-400 border border-white/10">
                        {item.category.name}
                      </div>
                    )}

                    {/* Price pill */}
                    <div className="absolute bottom-2.5 right-2.5 px-3 py-1 rounded-lg text-sm font-bold bg-orange-500 text-white shadow-md shadow-orange-500/30">
                      {Number(item.price).toLocaleString('vi-VN')} ₫
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-white/5"
                        >
                          #{t.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls: Availability Toggle & Edit/Delete */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between"
                >
                  {/* Availability toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.is_available}
                      onChange={() => handleToggleItemAvailability(item)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 relative" />
                    <span
                      className={`text-xs font-semibold ${
                        item.is_available ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {item.is_available ? 'Còn món' : 'Hết món'}
                    </span>
                  </label>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setIsMenuModalOpen(true);
                      }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Chỉnh sửa món"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingItemId(item.id)}
                      className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
                      title="Xóa món"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setDeletingItemId(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Xác nhận xóa món ăn?</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Món ăn sẽ bị gỡ bỏ khỏi thực đơn quán và khách hàng không thể đặt món này nữa.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingItemId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMenuItem(deletingItemId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/30 transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MenuItemDialog
        isOpen={isMenuModalOpen}
        onClose={() => {
          setIsMenuModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveMenuItem}
        initialItem={editingItem}
        categories={categories}
        tags={tags}
      />

      <RestaurantProfileDialog
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSubmit={handleUpdateProfile}
        restaurant={restaurant}
        availableCategories={categories}
      />

      <FoodItemDetailDialog
        item={viewingMenuItem}
        isOpen={Boolean(viewingMenuItem)}
        onClose={() => setViewingMenuItem(null)}
        onEdit={(item) => {
          setEditingItem(item);
          setIsMenuModalOpen(true);
        }}
        onToggleAvailability={handleToggleItemAvailability}
        customerComment={null}
        customerOptions={null}
      />
    </div>
  );
}
