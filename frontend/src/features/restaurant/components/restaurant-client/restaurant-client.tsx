"use client";

import { useState, useMemo, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Search, 
  X, 
  Star, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Utensils, 
  ShieldCheck, 
  ShoppingBag
} from 'lucide-react';
import { CartWidget, useCartStore } from '@/features/cart';
import FoodCard from '@/features/menu/components/food-card/food-card';
import { AddToCartDialog } from '@/features/restaurant/components/add-to-cart-dialog/add-to-cart-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { RestaurantClientProps } from './types';
import type { MenuItem } from '@/features/menu/types';

interface CategoryGroup {
  id: string;
  name: string;
  items: MenuItem[];
}

export function RestaurantClient({ restaurant, menuItems }: RestaurantClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const cartTotalItems = useCartStore((state) => state.getTotalItems());
  const cartRestaurantId = useCartStore((state) => state.restaurantId);
  const isCurrentRestaurantInCart = cartRestaurantId === restaurant.id;

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return menuItems;
    const query = searchQuery.toLowerCase().trim();
    return menuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.category?.name && item.category.name.toLowerCase().includes(query))
    );
  }, [menuItems, searchQuery]);

  // Group items by category
  const categories = useMemo(() => {
    const groups: Record<string, CategoryGroup> = {};
    const uncategorizedItems: MenuItem[] = [];

    filteredItems.forEach((item) => {
      if (item.category && item.category.id) {
        const catId = item.category.id;
        if (!groups[catId]) {
          groups[catId] = {
            id: catId,
            name: item.category.name,
            items: [],
          };
        }
        groups[catId].items.push(item);
      } else {
        uncategorizedItems.push(item);
      }
    });

    const result = Object.values(groups);
    if (uncategorizedItems.length > 0) {
      result.unshift({
        id: 'special-items',
        name: 'Món đặc sắc & Khác',
        items: uncategorizedItems,
      });
    }

    return result;
  }, [filteredItems]);

  // Derive selected item from URL query param
  const itemId = searchParams.get('item');
  const selectedItem = itemId ? menuItems.find((i) => i.id === itemId) || null : null;

  const handleCloseDialog = () => {
    router.replace(pathname, { scroll: false });
  };

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    if (categoryId === 'all') {
      window.scrollTo({ top: 380, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(`cat-${categoryId}`);
    if (element) {
      const yOffset = -130; // accounts for sticky navbar + category tabs
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const ratingValue = restaurant.rating ? Number(restaurant.rating).toFixed(1) : '4.8';

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* 1. Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 transition-all duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 py-1.5 px-3 -ml-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
              aria-label="Quay lại thực đơn"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Khám phá</span>
            </Link>

            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-1.5">
                {restaurant.name}
                {restaurant.verification_status === 'VERIFIED' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 inline" />
                )}
              </h1>
            </div>
          </div>

          {/* Right Status / Mini Cart Indicator */}
          <div className="flex items-center gap-3">
            {cartTotalItems > 0 && isCurrentRestaurantInCart && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{cartTotalItems} món trong giỏ</span>
              </div>
            )}
            <Badge
              variant="outline"
              className={
                restaurant.is_active
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-medium'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 text-xs'
              }
            >
              {restaurant.is_active ? 'Đang mở cửa' : 'Tạm đóng'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* 2. Restaurant Hero Banner */}
        <section className="relative w-full rounded-3xl overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl mb-8">
          {/* Cover Background Graphic */}
          <div className="relative h-48 sm:h-64 lg:h-72 w-full overflow-hidden bg-gradient-to-r from-zinc-950 via-zinc-900 to-orange-950/40">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-500/15 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
            
            {/* Atmospheric decoration */}
            <div className="absolute top-6 right-8 text-orange-500/10 hidden md:block">
              <Utensils className="w-48 h-48 -rotate-12" />
            </div>
          </div>

          {/* Restaurant Identity Overlay Card */}
          <div className="relative -mt-20 sm:-mt-24 p-5 sm:p-8 pt-0 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Restaurant Avatar/Emblem */}
              <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-zinc-900 border-2 border-white/10 shadow-2xl overflow-hidden flex items-center justify-center shrink-0 bg-gradient-to-br from-zinc-800 to-zinc-950">
                <Utensils className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500/80" />
              </div>

              {/* Title and Badges */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                    {restaurant.name}
                  </h1>
                  {restaurant.verification_status === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Đối tác chính hãng
                    </span>
                  )}
                </div>

                {/* Address & Meta */}
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                  <span className="line-clamp-1">{restaurant.address}</span>
                </div>

                {/* Key Metrics Row */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 pt-1 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{ratingValue}</span>
                    <span className="text-zinc-500 font-normal">(150+ đánh giá)</span>
                  </div>

                  <span className="text-zinc-700">•</span>

                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span>20 - 30 phút</span>
                  </div>

                  <span className="text-zinc-700">•</span>

                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Freeship từ 100k</span>
                  </div>
                </div>

                {/* Cuisine Categories */}
                {restaurant.categories && restaurant.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {restaurant.categories.map((cat) => (
                      <span
                        key={cat.id}
                        className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-zinc-300"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Search and Quick Filter Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm món ăn trong quán..."
              className="pl-10 pr-9 bg-zinc-900/80 border-white/10 text-white placeholder:text-zinc-500 rounded-xl focus:border-orange-500/50 focus:ring-orange-500/20 h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-zinc-400 self-center sm:self-auto font-medium">
            Có <span className="text-white font-bold">{filteredItems.length}</span> món đang phục vụ
          </div>
        </div>

        {/* 4. Sticky Category Pill Tabs Bar */}
        {categories.length > 1 && (
          <div className="sticky top-[57px] z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-black/90 backdrop-blur-md border-b border-white/10 mb-6">
            <div 
              ref={categoryScrollRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 no-scrollbar"
            >
              <button
                type="button"
                onClick={() => scrollToCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeCategory === 'all'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                }`}
              >
                Tất cả ({filteredItems.length})
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                  }`}
                >
                  {cat.name} ({cat.items.length})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Menu Content by Category */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-zinc-950 rounded-3xl border border-white/5 p-8 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4 text-orange-400">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Không tìm thấy món ăn</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Không có món ăn nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;. Vui lòng thử tìm từ khóa khác.
            </p>
            <Button
              onClick={() => setSearchQuery('')}
              variant="outline"
              className="border-white/10 hover:bg-white/10 text-white rounded-xl"
            >
              Xóa tìm kiếm
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((cat, catIdx) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-36">
                {/* Category Section Header */}
                <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      {cat.name}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5">
                      {cat.items.length} món
                    </span>
                  </div>
                </div>

                {/* Category Dishes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {cat.items.map((item, index) => (
                    <FoodCard
                      key={item.id}
                      item={item}
                      index={catIdx * 10 + index}
                      mode="restaurant"
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* 6. Product Detail / Add To Cart Modal */}
      <AddToCartDialog
        item={selectedItem}
        restaurantId={restaurant.id}
        isOpen={!!selectedItem}
        onClose={handleCloseDialog}
      />

      {/* 7. Floating Cart Widget */}
      <CartWidget />
    </div>
  );
}
