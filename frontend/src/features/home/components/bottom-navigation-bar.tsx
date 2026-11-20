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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/70 md:hidden pb-safe transition-colors">
      <div className="grid grid-cols-4 h-14">
        {/* 1. Trang chủ */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            pathname === '/' ? 'text-primary font-semibold' : 'text-zinc-400 hover:text-foreground'
          }`}
        >
          <div className="relative">
            <Home className="w-4.5 h-4.5" />
            {pathname === '/' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Trang chủ</span>
        </Link>

        {/* 2. Đơn hàng */}
        <Link
          href={ordersHref}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            pathname?.startsWith('/orders') || pathname?.startsWith('/history')
              ? 'text-primary font-semibold'
              : 'text-zinc-400 hover:text-foreground'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-4.5 h-4.5" />
            {activeOrderId && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Đơn hàng</span>
        </Link>

        {/* 3. Thông báo */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-foreground transition-colors cursor-pointer"
        >
          <div className="relative">
            <Bell className="w-4.5 h-4.5" />
            {hasUnreadNotifications && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Thông báo</span>
        </button>

        {/* 4. Tài khoản */}
        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            pathname?.startsWith('/profile') || pathname?.startsWith('/rewards')
              ? 'text-primary font-semibold'
              : 'text-zinc-400 hover:text-foreground'
          }`}
        >
          <User className="w-4.5 h-4.5" />
          <span className="text-[10px] tracking-tight">Tài khoản</span>
        </Link>
      </div>
    </nav>
  );
}
