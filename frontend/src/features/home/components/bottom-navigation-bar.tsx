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
  const profileHref = isAuthenticated ? '/profile' : '/login';

  const isHome = pathname === '/';
  const isOrders = Boolean(pathname?.startsWith('/orders') || pathname?.startsWith('/history'));
  const isProfile = Boolean(pathname?.startsWith('/profile') || pathname?.startsWith('/rewards'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border md:hidden pb-safe transition-colors">
      <div className="grid grid-cols-4 h-16 px-2 items-center">
        {/* 1. Trang chủ */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors ${
            isHome
              ? 'bg-primary/12 text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="w-4.5 h-4.5" />
          <span className="text-[10px] tracking-tight">Trang chủ</span>
        </Link>

        {/* 2. Đơn hàng */}
        <Link
          href={ordersHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors ${
            isOrders
              ? 'bg-primary/12 text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="relative">
            <ClipboardList className="w-4.5 h-4.5" />
            {activeOrderId && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Đơn hàng</span>
        </Link>

        {/* 3. Thông báo */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <div className="relative">
            <Bell className="w-4.5 h-4.5" />
            {hasUnreadNotifications && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Thông báo</span>
        </button>

        {/* 4. Tài khoản */}
        <Link
          href={profileHref}
          className={`flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl transition-colors ${
            isProfile
              ? 'bg-primary/12 text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-4.5 h-4.5" />
          <span className="text-[10px] tracking-tight">Tài khoản</span>
        </Link>
      </div>
    </nav>
  );
}
