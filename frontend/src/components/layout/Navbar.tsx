'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UtensilsCrossed, Menu, ClipboardList, LogIn, User, LogOut, History, ChevronDown, Bike, Store } from 'lucide-react';
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
      refreshProfile().catch(() => {});
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAuthenticated, refreshProfile]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 shadow-md shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow duration-300">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            FoodDelivery
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Icon className="w-4 h-4" />
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
                    className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500/20 to-red-600/20 flex items-center justify-center text-orange-500 border border-orange-500/20">
                      <User className="w-4 h-4" />
                    </div>
                    <span className="hidden sm:inline font-medium">{user?.name}</span>
                    <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 bg-zinc-900 border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 z-50">
                      <Link
                        href="/history"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <History className="w-4 h-4 text-zinc-400" />
                        Lịch sử mua hàng
                      </Link>

                      <div className="h-px bg-white/10 my-1"></div>

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
                              className="flex items-center justify-between px-4 py-3 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Bike className="w-4 h-4 text-emerald-400" />
                                <span className="font-medium">Trung tâm tài xế</span>
                              </div>
                              <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                                <span className="text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
                              </span>
                            </Link>
                          );
                        }

                        if (isPendingDriver) {
                          return (
                            <div className="flex items-center justify-between px-4 py-2.5 text-sm text-amber-400/90 bg-amber-500/5 cursor-default">
                              <div className="flex items-center gap-3">
                                <Bike className="w-4 h-4 text-amber-400" />
                                <span>Hồ sơ tài xế</span>
                              </div>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
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
                              className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
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
                              className="flex items-center gap-3 px-4 py-3 text-sm text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors font-medium"
                            >
                              <Store className="w-4 h-4 text-orange-400" />
                              Quán của tôi (Đối tác)
                            </Link>
                          );
                        }

                        if (isPendingRestaurant) {
                          return (
                            <div className="flex items-center justify-between px-4 py-2.5 text-sm text-amber-400/90 bg-amber-500/5 cursor-default">
                              <div className="flex items-center gap-3">
                                <Store className="w-4 h-4 text-amber-400" />
                                <span>Hồ sơ mở quán</span>
                              </div>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
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
                              className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Store className="w-4 h-4 text-zinc-400" />
                              Đăng ký mở quán
                            </Link>
                          );
                        }

                        return null;
                      })()}

                      <div className="h-px bg-white/10 my-1"></div>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors text-left"
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
                  className="flex items-center gap-2 px-4 py-2 ml-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-md shadow-orange-500/20 transition-all duration-200"
                >
                  <LogIn className="w-4 h-4" />
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
