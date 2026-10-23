'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ChevronDown,
  Search,
  ShoppingBag,
  Bell,
  Sparkles,
  TrendingUp,
  X,
  UtensilsCrossed,
  User as UserIcon,
} from 'lucide-react';
import { useLocationStore } from '../store/useLocationStore';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { useAuthStore } from '@/features/auth';
import { LocationModal } from './location-modal';

interface HomeHeaderProps {
  onOpenNotifications: () => void;
  hasUnreadNotifications?: boolean;
}

const ROTATING_PLACEHOLDERS = [
  'Thèm trà sữa trân châu đường đen?',
  'Tìm bún bò Huế nóng hổi...',
  'Cơm tấm sườn bì chả đặc biệt...',
  'Gà rán giòn rụm freeship 0Đ...',
  'Bánh mì chả lụa pate thơm béo...',
  'Cà phê sữa đá pha phin đậm đà...',
];

const TRENDING_KEYWORDS = [
  'Trà sữa',
  'Cơm tấm',
  'Bún bò Huế',
  'Gà rán',
  'Pizza',
  'Phở bò',
  'Bánh mì',
  'Trà đào',
];

export function HomeHeader({
  onOpenNotifications,
  hasUnreadNotifications = true,
}: HomeHeaderProps) {
  const router = useRouter();
  const { currentLocation } = useLocationStore();
  const { user, isAuthenticated } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Hiệu ứng đổi placeholder mỗi 3.5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % ROTATING_PLACEHOLDERS.length);
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    router.push(`/menu?q=${encodeURIComponent(searchInput.trim())}`);
  };

  const handleKeywordClick = (keyword: string) => {
    setSearchInput(keyword);
    router.push(`/menu?q=${encodeURIComponent(keyword)}`);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border/70 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 space-y-2.5">
          {/* Top Row: Location Selector & Action Icons */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Brand Logo */}
              <Link href="/" className="flex items-center gap-2 group shrink-0">
                <div className="p-1.5 rounded-lg bg-primary/15 text-primary border border-primary/25 transition-transform group-hover:scale-105">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span className="text-base font-semibold tracking-tight text-foreground hidden md:inline">
                  Food<span className="text-primary font-bold">Delivery</span>
                </span>
              </Link>

              {/* Location Selector Button */}
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card hover:bg-white/[0.04] border border-border text-left transition-all cursor-pointer group min-w-0 flex-1 sm:max-w-md"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-primary uppercase tracking-wider">
                    <span>Giao đến</span>
                    {currentLocation.label && (
                      <span className="text-muted-foreground font-normal">({currentLocation.label})</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">
                    {currentLocation.address}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-foreground shrink-0 ml-1" />
              </button>
            </div>

            {/* Right Action Icons (Notifications, Cart, Auth) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Notification Bell */}
              <button
                type="button"
                onClick={onOpenNotifications}
                aria-label="Thông báo"
                className="relative p-2 rounded-xl bg-card hover:bg-white/[0.04] text-zinc-300 hover:text-foreground border border-border transition-colors cursor-pointer"
              >
                <Bell className="w-4.5 h-4.5" />
                {hasUnreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
                )}
              </button>

              {/* Shopping Bag / Cart */}
              <Link
                href="/checkout"
                aria-label="Giỏ hàng"
                className="relative p-2 rounded-xl bg-primary text-primary-foreground font-medium transition-all shadow-xs shadow-orange-950/30 hover:brightness-105 active:scale-95"
              >
                <ShoppingBag className="w-4.5 h-4.5" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                    {totalCartItems}
                  </span>
                )}
              </Link>

              {/* User Avatar / Profile */}
              <Link
                href={isAuthenticated ? '/profile' : '/login'}
                aria-label={isAuthenticated ? 'Hồ sơ người dùng' : 'Đăng nhập'}
                className="relative w-8.5 h-8.5 rounded-xl bg-card hover:bg-white/[0.04] text-zinc-300 hover:text-foreground border border-border transition-all flex items-center justify-center shrink-0 overflow-hidden active:scale-95"
              >
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.name || 'User Avatar'}
                    fill
                    sizes="34px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-zinc-400" />
                )}
              </Link>
            </div>
          </div>

          {/* Sticky Dynamic Search Bar */}
          <div className="relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={ROTATING_PLACEHOLDERS[placeholderIndex]}
                className="w-full pl-10 pr-10 py-2 rounded-xl bg-card/80 border border-input text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-400 hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Trending Suggestions Dropdown */}
            {isSearchOpen && (
              <div
                className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setIsSearchOpen(false)}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-[11px] font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span>Tìm kiếm thịnh hành</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="text-zinc-500 hover:text-foreground text-[10px]"
                  >
                    Đóng
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TRENDING_KEYWORDS.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => {
                        handleKeywordClick(keyword);
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs border border-white/[0.04] hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-primary/70" />
                      <span>{keyword}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Location Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </>
  );
}
