"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Search, 
  X, 
  CheckCircle2, 
  ShoppingBag,
} from 'lucide-react';
import { useCartStore } from '@/features/cart';
import FoodCard from '@/features/menu/components/food-card/food-card';
import { AddToCartDialog } from '@/features/restaurant/components/add-to-cart-dialog/add-to-cart-dialog';
import { RestaurantHeader } from '@/features/restaurant/components/restaurant-header/restaurant-header';
import { FloatingBottomCart } from '@/features/restaurant/components/floating-bottom-cart/floating-bottom-cart';
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
  const isManualScrollingRef = useRef(false);

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
        (item.category?.name && item.category.name.toLowerCase().includes(query)),
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

  // Derive selected item from URL query param or manual click
  const itemFromUrl = useMemo(() => {
    const itemId = searchParams.get('item');
    return itemId ? menuItems.find((i) => i.id === itemId) || null : null;
  }, [searchParams, menuItems]);

  const [manuallySelectedItem, setManuallySelectedItem] = useState<MenuItem | null>(null);
  const selectedItem = manuallySelectedItem ?? itemFromUrl;

  const handleCloseDialog = () => {
    setManuallySelectedItem(null);
    if (searchParams.get('item')) {
      router.replace(pathname, { scroll: false });
    }
  };

  const handleOpenItem = (item: MenuItem) => {
    setManuallySelectedItem(item);
  };

  // Scroll to category with smooth scroll
  const scrollToCategory = (categoryId: string) => {
    isManualScrollingRef.current = true;
    setActiveCategory(categoryId);

    if (categoryId === 'all') {
      const topOffset = 450;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    } else {
      const element = document.getElementById(`cat-${categoryId}`);
      if (element) {
        const yOffset = -120; // Accounts for sticky top nav & category tabs
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }

    // Release manual scroll lock after animation completes
    setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 800);
  };

  // Scroll Spy: Synchronize category tab highlight with page scroll
  useEffect(() => {
    if (categories.length === 0) return;

    const handleScroll = () => {
      if (isManualScrollingRef.current) return;

      const scrollPosition = window.scrollY + 180;
      let currentActive = 'all';

      for (const cat of categories) {
        const element = document.getElementById(`cat-${cat.id}`);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            currentActive = cat.id;
            break;
          }
        }
      }

      setActiveCategory((prev) => {
        if (prev !== currentActive) {
          // Scroll horizontal tab container to center the active tab
          const activeTabButton = document.getElementById(`tab-btn-${currentActive}`);
          if (activeTabButton && categoryScrollRef.current) {
            activeTabButton.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'center',
            });
          }
        }
        return currentActive;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-36">
      {/* 1. Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border px-4 sm:px-6 py-3 transition-all duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 py-1.5 px-3 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs sm:text-sm font-medium"
              aria-label="Quay lại thực đơn"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Khám phá</span>
            </Link>

            <div className="h-4 w-[1px] bg-border hidden sm:block" />

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate flex items-center gap-1.5">
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
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{cartTotalItems} món trong giỏ</span>
              </div>
            )}

            <Badge
              variant="outline"
              className={
                restaurant.is_active
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-medium'
                  : 'bg-muted text-muted-foreground border-border text-xs'
              }
            >
              {restaurant.is_active ? 'Đang mở cửa' : 'Tạm đóng'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {/* 2. Restaurant Identity & Dynamic Delivery Header */}
        <RestaurantHeader restaurant={restaurant} />

        {/* 3. Search and Count Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm món ăn trong thực đơn của quán..."
              className="pl-10 pr-9 bg-card border-border text-foreground placeholder:text-muted-foreground/60 rounded-xl focus:border-primary/50 focus:ring-primary/20 h-11 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-muted-foreground self-center sm:self-auto font-medium">
            Có <span className="text-foreground font-bold">{filteredItems.length}</span> món đang phục vụ
          </div>
        </div>

        {/* 4. Sticky Category Pill Tabs with Scroll Spy */}
        {categories.length > 0 && (
          <div className="sticky top-[57px] z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-background/90 backdrop-blur-md border-b border-border mb-8">
            <div 
              ref={categoryScrollRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 no-scrollbar scroll-smooth"
            >
              <button
                id="tab-btn-all"
                type="button"
                onClick={() => scrollToCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  activeCategory === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border'
                }`}
              >
                Tất cả ({filteredItems.length})
              </button>

              {categories.map((cat) => (
                <button
                  id={`tab-btn-${cat.id}`}
                  key={cat.id}
                  type="button"
                  onClick={() => scrollToCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    activeCategory === cat.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card text-muted-foreground hover:text-foreground hover:bg-secondary border border-border'
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
          <div className="text-center py-20 bg-card rounded-2xl border border-border p-8 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1.5">Không tìm thấy món ăn</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">
              Không có món ăn nào phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;. Vui lòng thử tìm từ khóa khác.
            </p>
            <Button
              onClick={() => setSearchQuery('')}
              variant="outline"
              className="rounded-xl"
            >
              Xóa tìm kiếm
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            {categories.map((cat, catIdx) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-36">
                {/* Category Section Header */}
                <div className="flex items-center justify-between mb-5 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                      {cat.name}
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
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
                      isRestaurantClosed={!restaurant.is_active}
                      onSelect={handleOpenItem}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* 6. Product Detail & Modifier Customization Dialog */}
      <AddToCartDialog
        item={selectedItem}
        restaurantId={restaurant.id}
        isOpen={!!selectedItem}
        onClose={handleCloseDialog}
      />

      {/* 7. Floating Bottom Cart Bar */}
      <FloatingBottomCart
        currentRestaurantId={restaurant.id}
        currentRestaurantName={restaurant.name}
      />
    </div>
  );
}
