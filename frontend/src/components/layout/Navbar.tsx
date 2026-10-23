'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, Menu, ClipboardList, LogIn, User, LogOut, History, ChevronDown, Bike, Store, MapPin, Award } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useEffect, useState, useRef } from 'react';

const NAV_ITEMS = [
  { href: '/menu', label: 'Thực đơn', icon: Menu },
  { href: '/orders/f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', label: 'Đơn hàng', icon: ClipboardList },
];

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout, refreshProfile } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    if (isAuthenticated) {
      refreshProfile().catch((err) => {
        console.warn('[Navbar] Failed to refresh user profile:', err);
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated, refreshProfile]);

  if (pathname?.startsWith('/admin') || pathname === '/') {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl transition-colors">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-15 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-lg bg-primary/15 text-primary border border-primary/25 transition-transform duration-200 group-hover:scale-105">
            <UtensilsCrossed className="w-4 h-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Food<span className="text-primary font-bold">Delivery</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'text-foreground bg-white/[0.08] shadow-xs'
                    : 'text-zinc-400 hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          {/* Auth section - only render after mount to avoid hydration mismatch */}
          {mounted && (
            <>
              {isAuthenticated ? (
                <div className="relative ml-4 pl-4 border-l border-white/10" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 text-xs text-zinc-300 hover:text-foreground transition-colors focus:outline-none"
                  >
                    <div className="w-7.5 h-7.5 rounded-full bg-primary/15 flex items-center justify-center text-primary border border-primary/25">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="hidden sm:inline font-medium">{user?.name}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-56 bg-card border border-border rounded-xl shadow-2xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 z-50">
                      <Link
                        href="/rewards"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition-colors"
                      >
                        <Award className="w-4 h-4 text-amber-400" />
                        <span className="font-medium">Điểm & Hạng thành viên</span>
                      </Link>

                      <Link
                        href="/history"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                      >
                        <History className="w-4 h-4 text-zinc-400" />
                        Lịch sử mua hàng
                      </Link>

                      <Link
                        href="/profile/addresses"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-zinc-400" />
                        Sổ địa chỉ
                      </Link>

                      <div className="h-px bg-border my-1"></div>

                      {/* Driver Section */}
                      {(() => {
                        const isApprovedDriver = Boolean(user?.hasDriver || user?.driverProfile?.verification_status === 'APPROVED');
                        const isPendingDriver = !isApprovedDriver && user?.driverRegistrationStatus === 'PENDING';
                        const canRegisterDriver = !isApprovedDriver && !isPendingDriver;

                        if (isApprovedDriver) {
                          const isOnline = user?.driverProfile?.status === 'ONLINE';
                          return (
                            <Link
                              href="/driver/dashboard"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center justify-between px-4 py-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Bike className="w-4 h-4 text-emerald-400" />
                                <span className="font-medium">Trung tâm tài xế</span>
                              </div>
                              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                                <span className="text-[10px]">{isOnline ? 'Online' : 'Offline'}</span>
                              </span>
                            </Link>
                          );
                        }

                        if (isPendingDriver) {
                          return (
                            <div className="flex items-center justify-between px-4 py-2.5 text-xs text-amber-400/90 bg-amber-500/5 cursor-default">
                              <div className="flex items-center gap-3">
                                <Bike className="w-4 h-4 text-amber-400" />
                                <span>Hồ sơ tài xế</span>
                              </div>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                Đang duyệt
                              </span>
                            </div>
                          );
                        }

                        if (canRegisterDriver) {
                          return (
                            <Link
                              href="/register/driver"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                            >
                              <Bike className="w-4 h-4 text-amber-400" />
                              Đăng ký làm tài xế
                            </Link>
                          );
                        }

                        return null;
                      })()}

                      {/* Restaurant Section */}
                      {(() => {
                        const isApprovedRestaurant = Boolean(user?.hasRestaurant || user?.restaurant || user?.restaurantRegistrationStatus === 'APPROVED');
                        const isPendingRestaurant = !isApprovedRestaurant && user?.restaurantRegistrationStatus === 'PENDING';
                        const canRegisterRestaurant = !isApprovedRestaurant && !isPendingRestaurant;

                        if (isApprovedRestaurant) {
                          return (
                            <Link
                              href="/partner/restaurant"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors font-medium"
                            >
                              <Store className="w-4 h-4 text-orange-400" />
                              Quán của tôi (Đối tác)
                            </Link>
                          );
                        }

                        if (isPendingRestaurant) {
                          return (
                            <div className="flex items-center justify-between px-4 py-2.5 text-xs text-amber-400/90 bg-amber-500/5 cursor-default">
                              <div className="flex items-center gap-3">
                                <Store className="w-4 h-4 text-amber-400" />
                                <span>Hồ sơ mở quán</span>
                              </div>
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                Đang duyệt
                              </span>
                            </div>
                          );
                        }

                        if (canRegisterRestaurant) {
                          return (
                            <Link
                              href="/register/restaurant"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-300 hover:text-foreground hover:bg-white/[0.04] transition-colors"
                            >
                              <Store className="w-4 h-4 text-zinc-400" />
                              Đăng ký mở quán
                            </Link>
                          );
                        }

                        return null;
                      })()}

                      <div className="h-px bg-border my-1"></div>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 ml-2 rounded-lg text-xs font-medium text-primary-foreground bg-primary hover:brightness-105 active:scale-[0.98] shadow-xs shadow-orange-950/20 transition-all duration-150"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Link>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
