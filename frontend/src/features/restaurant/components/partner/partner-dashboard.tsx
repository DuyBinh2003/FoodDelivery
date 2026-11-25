'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Banknote,
  Clock,
} from 'lucide-react';
import { OperatingHoursDialog } from './operating-hours-dialog';
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
import { WithdrawModal } from '@/features/payment/components/WithdrawModal';

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
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isOperatingHoursModalOpen, setIsOperatingHoursModalOpen] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('orders');

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [resData, catsData, tagsData] = await Promise.all([
        getMyRestaurant().catch((err) => {
          console.warn('[PartnerDashboard] Failed to fetch restaurant:', err);
          return null;
        }),
        getAvailableCategories().catch((err) => {
          console.warn('[PartnerDashboard] Failed to fetch categories:', err);
          return [];
        }),
        getAvailableTags().catch((err) => {
          console.warn('[PartnerDashboard] Failed to fetch tags:', err);
          return [];
        }),
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
          getMyRestaurant().catch((err) => {
            console.warn('[PartnerDashboard] Failed to fetch restaurant:', err);
            return null;
          }),
          getAvailableCategories().catch((err) => {
            console.warn('[PartnerDashboard] Failed to fetch categories:', err);
            return [];
          }),
          getAvailableTags().catch((err) => {
            console.warn('[PartnerDashboard] Failed to fetch tags:', err);
            return [];
          }),
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
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm">Đang tải thông tin quán ăn của bạn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="bg-destructive/10 border border-destructive/25 rounded-3xl p-8">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h3 className="font-heading text-lg font-bold text-foreground mb-2">
            Đã xảy ra lỗi khi tải dữ liệu
          </h3>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <button
            type="button"
            onClick={() => loadData()}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold transition-colors cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4">
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center shadow-lg relative overflow-hidden">
          <div className="w-20 h-20 bg-primary/12 border border-primary/25 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary">
            <Store className="w-10 h-10" />
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
            Bạn chưa có nhà hàng được kích hoạt
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8 text-sm sm:text-base">
            Nếu bạn đã gửi yêu cầu đăng ký mở quán, vui lòng chờ Ban quản trị phê duyệt. Sau khi được duyệt, bạn sẽ có thể quản lý thực đơn, đặt giá bán và mở cửa nhận đơn tại đây.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register/restaurant"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-dark shadow-sm transition-all"
            >
              <span>Đăng ký mở quán ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/menu"
              className="px-6 py-3 rounded-xl text-sm font-semibold text-foreground bg-secondary hover:bg-muted border border-border transition-colors"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border transition-all animate-in ${
            toastMessage.type === 'success'
              ? 'bg-card border-primary/35 text-primary'
              : 'bg-card border-destructive/35 text-destructive'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Desktop Sidebar (240px equivalent: 3 cols) */}
        <aside className="lg:col-span-3 lg:sticky lg:top-20 bg-card border border-border rounded-3xl p-5 space-y-5 shadow-xs">
          <div className="space-y-2 pb-4 border-b border-border">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/12 text-primary border border-primary/25">
              <CheckCircle2 className="w-3 h-3" />
              Đối tác đã duyệt
            </span>
            <h1 className="font-heading text-xl font-extrabold text-foreground leading-tight">
              {restaurant.name}
            </h1>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span className="line-clamp-2">{restaurant.address || 'Chưa cập nhật địa chỉ'}</span>
            </p>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-500 pt-0.5">
              <Star className="w-3.5 h-3.5 fill-amber-500" />
              <span>{restaurant.rating || 5.0}</span>
              <span className="text-muted-foreground font-normal">(Đánh giá)</span>
            </div>
          </div>

          {/* Store Online Switch */}
          <div
            className={`p-3.5 rounded-2xl border transition-colors ${
              restaurant.is_active
                ? 'bg-primary/8 border-primary/30'
                : 'bg-amber-500/8 border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    restaurant.is_active ? 'bg-primary animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="text-xs font-bold text-foreground truncate">
                  {restaurant.is_active ? 'Đang mở cửa' : 'Tạm đóng cửa'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={statusToggling}
                aria-label="Chuyển trạng thái mở cửa"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  restaurant.is_active ? 'bg-primary' : 'bg-muted-foreground/40'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                    restaurant.is_active ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Primary Navigation */}
          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Bếp & Đơn hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'menu'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <UtensilsCrossed className="w-4 h-4" />
                <span>Thực đơn</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                {menuItems.length}
              </span>
            </button>
          </nav>

          {/* Utility Actions */}
          <div className="pt-3 border-t border-border space-y-2">
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(true)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/15 text-xs font-bold text-primary border border-primary/20 transition-colors cursor-pointer"
            >
              <Banknote className="w-4 h-4" />
              <span>Rút doanh thu</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOperatingHoursModalOpen(true)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-muted text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-primary" />
              <span>Giờ mở cửa</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-muted text-xs font-semibold text-foreground border border-border transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4 text-muted-foreground" />
              <span>Sửa thông tin quán</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Stats Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Tổng món
              </span>
              <p className="font-heading text-2xl font-extrabold text-foreground mt-1">
                {menuItems.length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Đang mở bán
              </span>
              <p className="font-heading text-2xl font-extrabold text-primary mt-1">
                {activeDishesCount}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Tạm hết món
              </span>
              <p className="font-heading text-2xl font-extrabold text-muted-foreground mt-1">
                {menuItems.length - activeDishesCount}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Trạng thái
              </span>
              <p
                className={`text-sm font-bold mt-2 flex items-center gap-1.5 ${
                  restaurant.is_active ? 'text-primary' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                <Power className="w-4 h-4" />
                {restaurant.is_active ? 'Đang nhận đơn' : 'Nghỉ bán'}
              </p>
            </div>
          </div>

          {activeTab === 'orders' ? (
            <KitchenOrdersTab
              restaurantId={restaurant.id}
              showToast={showToast}
              menuItems={menuItems}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground">
                    Quản lý thực đơn món ăn
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Điều chỉnh giá cả, bật/tắt còn món, gán tag và danh mục món ăn
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setIsMenuModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-primary-foreground bg-primary hover:bg-primary-dark shadow-sm transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm món mới</span>
                </button>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm theo tên món ăn..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-input text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategoryFilter === 'ALL'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                    }`}
                  >
                    Tất cả ({menuItems.length})
                  </button>
                  {categories.map((cat) => {
                    const count = menuItems.filter((m) => m.category_id === cat.id).length;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setSelectedCategoryFilter(cat.id)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          selectedCategoryFilter === cat.id
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-card text-muted-foreground hover:text-foreground border border-border'
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
                <div className="bg-card border border-border rounded-3xl p-12 text-center">
                  <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-bold">Không tìm thấy món ăn phù hợp</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {searchQuery
                      ? 'Thử tìm với từ khóa khác'
                      : 'Bấm "+ Thêm món mới" để bắt đầu xây dựng thực đơn'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredMenuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setViewingMenuItem(item)}
                      className={`group bg-card border rounded-2xl p-4 shadow-xs transition-all flex flex-col justify-between cursor-pointer ${
                        item.is_available
                          ? 'border-border hover:border-primary/45 hover:shadow-md'
                          : 'border-border opacity-70'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="relative h-40 w-full rounded-xl overflow-hidden bg-muted">
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
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                              <UtensilsCrossed className="w-8 h-8 mb-1" />
                              <span className="text-xs">Chưa có ảnh</span>
                            </div>
                          )}

                          {item.category && (
                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/70 backdrop-blur-md text-white">
                              {item.category.name}
                            </div>
                          )}

                          <div className="absolute bottom-2.5 right-2.5 flex flex-col items-end gap-1">
                            <div className="px-2.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-sm">
                              {Number(item.price).toLocaleString('vi-VN')} ₫
                            </div>
                            <div className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/75 backdrop-blur-md text-emerald-300">
                              Thực nhận: {Math.round(Number(item.price) * 0.8).toLocaleString('vi-VN')} ₫
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-heading text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.tags.map((t) => (
                              <span
                                key={t.id}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground border border-border"
                              >
                                #{t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="pt-4 mt-4 border-t border-border flex items-center justify-between"
                      >
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_available}
                            onChange={() => handleToggleItemAvailability(item)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary relative" />
                          <span
                            className={`text-xs font-semibold ${
                              item.is_available ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          >
                            {item.is_available ? 'Còn món' : 'Hết món'}
                          </span>
                        </label>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItem(item);
                              setIsMenuModalOpen(true);
                            }}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                            title="Chỉnh sửa món"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingItemId(item.id)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
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
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeletingItemId(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 animate-in text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/12 text-destructive flex items-center justify-center mx-auto mb-4 border border-destructive/25">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground mb-2">
              Xác nhận xóa món ăn?
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Món ăn sẽ bị gỡ bỏ khỏi thực đơn quán và khách hàng không thể đặt món này nữa.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingItemId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-secondary hover:bg-muted transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeleteMenuItem(deletingItemId)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-destructive hover:opacity-90 transition-colors cursor-pointer"
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

      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        requesterId={restaurant.id}
        requesterType="RESTAURANT"
        onSuccess={() => {
          showToast('success', 'Yêu cầu rút doanh thu đã được tạo thành công!');
        }}
      />
      {isOperatingHoursModalOpen && (
        <OperatingHoursDialog
          isOpen={isOperatingHoursModalOpen}
          onClose={() => setIsOperatingHoursModalOpen(false)}
          onSuccess={() => showToast('success', 'Đã cập nhật lịch hoạt động thành công')}
        />
      )}
    </div>
  );
}
