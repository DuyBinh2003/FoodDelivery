'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Bell, User } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface BottomNavigationBarProps {
  onOpenNotifications: () => void;
  hasUnreadNotifications?: boolean;
  activeOrderId?: string | null;
}

export function BottomNavigationBar({
  onOpenNotifications,
  hasUnreadNotifications = false,
  activeOrderId,
}: BottomNavigationBarProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  const ordersHref = activeOrderId ? `/orders/${activeOrderId}` : '/history';
  const profileHref = isAuthenticated ? '/profile/addresses' : '/login';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 md:hidden pb-safe">
      <div className="grid grid-cols-4 h-16">
        {/* 1. Trang chủ */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            pathname === '/' ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <Home className="w-5 h-5" />
            {pathname === '/' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Trang chủ</span>
        </Link>

        {/* 2. Đơn hàng */}
        <Link
          href={ordersHref}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            pathname?.startsWith('/orders') || pathname?.startsWith('/history')
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-5 h-5" />
            {activeOrderId && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Đơn hàng</span>
        </Link>

        {/* 3. Thông báo */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {hasUnreadNotifications && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Thông báo</span>
        </button>

        {/* 4. Tài khoản */}
        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            pathname?.startsWith('/profile') || pathname?.startsWith('/rewards')
              ? 'text-amber-400 font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] tracking-tight">Tài khoản</span>
        </Link>
      </div>
    </nav>
  );
}
