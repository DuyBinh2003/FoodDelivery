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
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-xl border-b border-white/[0.08] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
          {/* Top Row: Location Selector & Action Icons */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Brand Logo */}
              <Link href="/" className="flex items-center gap-2 group shrink-0">
                <div className="p-1.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-extrabold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent hidden md:inline">
                  FoodDelivery
                </span>
              </Link>

              {/* Location Selector Button */}
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group min-w-0 flex-1 sm:max-w-md"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    <span>Giao đến</span>
                    {currentLocation.label && (
                      <span className="text-zinc-400 font-normal">({currentLocation.label})</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white truncate">
                    {currentLocation.address}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-white shrink-0 ml-1" />
              </button>
            </div>

            {/* Right Action Icons (Notifications, Cart, Auth) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Notification Bell */}
              <button
                type="button"
                onClick={onOpenNotifications}
                aria-label="Thông báo"
                className="relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5" />
                {hasUnreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-zinc-950 animate-pulse" />
                )}
              </button>

              {/* Shopping Bag / Cart */}
              <Link
                href="/checkout"
                aria-label="Giỏ hàng"
                className="relative p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-zinc-950 font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                <ShoppingBag className="w-5 h-5 text-zinc-950" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center ring-2 ring-zinc-950 animate-bounce">
                    {totalCartItems}
                  </span>
                )}
              </Link>

              {/* User Avatar / Profile */}
              <Link
                href={isAuthenticated ? '/profile' : '/login'}
                aria-label={isAuthenticated ? 'Hồ sơ người dùng' : 'Đăng nhập'}
                className="relative w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center justify-center shrink-0 overflow-hidden active:scale-95"
              >
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.name || 'User Avatar'}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <UserIcon className="w-5 h-5 text-zinc-300" />
                )}
              </Link>
            </div>
          </div>

          {/* Sticky Dynamic Search Bar */}
          <div className="relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={ROTATING_PLACEHOLDERS[placeholderIndex]}
                className="w-full pl-11 pr-12 py-3 rounded-2xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-400 text-sm focus:outline-none focus:border-amber-500 shadow-inner transition-all duration-300"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Trending Suggestions Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 p-4 rounded-3xl bg-zinc-900/95 border border-white/10 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wide">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Tìm kiếm thịnh hành</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Đóng
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TRENDING_KEYWORDS.map((kw) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => {
                        handleKeywordClick(kw);
                        setIsSearchOpen(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/15 border border-white/5 hover:border-amber-500/30 text-xs font-medium text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400/80" />
                      <span>{kw}</span>
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
