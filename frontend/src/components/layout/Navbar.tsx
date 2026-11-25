'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  UtensilsCrossed,
  Menu as MenuIcon,
  X,
  ClipboardList,
  LogIn,
  User,
  LogOut,
  History,
  ChevronDown,
  Bike,
  Store,
  MapPin,
  Award,
  ShoppingBag,
  Bell,
  Sun,
  Moon,
  Globe,
  Tag,
  Home,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useCartStore } from '@/features/cart/store/useCartStore';
import { useLocationStore } from '@/features/home/store/useLocationStore';
import { useTheme } from '@/components/providers/theme-provider';
import { useAppLocale } from '@/components/providers/locale-provider';
import { LocationModal } from '@/features/home/components/location-modal';
import { NotificationDrawer } from '@/features/home/components/notification-drawer';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useRef, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

export function Navbar() {
  const pathname = usePathname();
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useAppLocale();

  const { isAuthenticated, user, logout, refreshProfile } = useAuthStore();
  const cartItems = useCartStore((state) => state.items);
  const totalCartItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const { currentLocation } = useLocationStore();

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      refreshProfile().catch((err: unknown) => {
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

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const navLinks = [
    { href: '/', label: tNav('home'), icon: Home, exact: true },
    { href: '/menu', label: tNav('restaurants'), icon: UtensilsCrossed, exact: false },
    { href: '/vouchers', label: tNav('promotions'), icon: Tag, exact: false },
    { href: '/history', label: tNav('orders'), icon: ClipboardList, exact: false },
  ];

  const isActiveLink = (href: string, exact: boolean) => {
    if (!pathname) return false;
    return exact ? pathname === href : pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-xl transition-colors">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand Logo + Location Selector */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
                <UtensilsCrossed className="w-4.5 h-4.5" />
              </div>
              <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
                Food<span className="text-primary">Delivery</span>
              </span>
            </Link>

            {/* Location Selector Pill */}
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/70 hover:bg-secondary border border-border text-left transition-all cursor-pointer group min-w-0 max-w-[230px] lg:max-w-[260px]"
            >
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-primary leading-none">
                  {tNav('deliverTo')}
                </span>
                <span className="block text-xs font-medium text-foreground truncate mt-0.5">
                  {currentLocation.address}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
            </button>
          </div>

          {/* Center: Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isActiveLink(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-primary/12 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: Utilities + Cart + Auth */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Locale Switcher (VI / EN) */}
            <button
              type="button"
              onClick={toggleLocale}
              aria-label={tCommon('language')}
              title={locale === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
              className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-xl bg-card hover:bg-secondary text-foreground border border-border text-xs font-bold transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>{locale.toUpperCase()}</span>
            </button>

            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? tCommon('lightMode') : tCommon('darkMode')}
              title={theme === 'dark' ? tCommon('lightMode') : tCommon('darkMode')}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-card hover:bg-secondary text-foreground border border-border transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-foreground/75" />
              )}
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={() => setIsNotificationDrawerOpen(true)}
              aria-label={tNav('notifications')}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-card hover:bg-secondary text-foreground border border-border transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
            </button>

            {/* Cart Button */}
            <Link
              href="/checkout"
              aria-label={tNav('cart')}
              className="relative inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:px-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark font-semibold text-xs gap-1.5 shadow-sm shadow-primary/20 transition-all active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden xl:inline">{tNav('cart')}</span>
              {mounted && totalCartItems > 0 && (
                <span className="min-w-[18px] h-4.5 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                  {totalCartItems}
                </span>
              )}
            </Link>

            {/* Auth Section */}
            {mounted && (
              <>
                {isAuthenticated ? (
                  <div className="relative pl-1" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-card hover:bg-secondary border border-border text-xs text-foreground transition-colors cursor-pointer"
                    >
                      <div className="relative w-7 h-7 rounded-lg bg-primary/12 flex items-center justify-center text-primary overflow-hidden shrink-0">
                        {user?.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name || 'User Avatar'}
                            fill
                            sizes="28px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <User className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="hidden md:inline font-semibold max-w-[100px] truncate">
                        {user?.name}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2.5 w-60 bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl overflow-hidden py-1.5 animate-in z-50">
                        <div className="px-4 py-2 border-b border-border/70">
                          <p className="text-xs font-bold text-foreground truncate">{user?.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                        </div>

                        <Link
                          href="/profile"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <User className="w-4 h-4 text-primary" />
                          {tNav('profile')}
                        </Link>

                        <Link
                          href="/rewards"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 transition-colors"
                        >
                          <Award className="w-4 h-4 text-amber-500" />
                          Điểm & Hạng thành viên
                        </Link>

                        <Link
                          href="/history"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <History className="w-4 h-4 text-muted-foreground" />
                          Lịch sử mua hàng
                        </Link>

                        <Link
                          href="/profile/addresses"
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                        >
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {tNav('addresses')}
                        </Link>

                        <div className="h-px bg-border my-1" />

                        {/* Driver Section */}
                        {(() => {
                          const isApprovedDriver = Boolean(
                            user?.hasDriver || user?.driverProfile?.verification_status === 'APPROVED',
                          );
                          const isPendingDriver =
                            !isApprovedDriver && user?.driverRegistrationStatus === 'PENDING';
                          const canRegisterDriver = !isApprovedDriver && !isPendingDriver;

                          if (isApprovedDriver) {
                            const isOnline = user?.driverProfile?.status === 'ONLINE';
                            return (
                              <Link
                                href="/driver/dashboard"
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center justify-between px-4 py-2.5 text-xs text-primary hover:bg-primary/10 transition-colors font-semibold"
                              >
                                <div className="flex items-center gap-3">
                                  <Bike className="w-4 h-4 text-primary" />
                                  <span>Trung tâm tài xế</span>
                                </div>
                                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isOnline ? 'bg-primary animate-pulse' : 'bg-muted-foreground'
                                    }`}
                                  />
                                  {isOnline ? 'Online' : 'Offline'}
                                </span>
                              </Link>
                            );
                          }

                          if (isPendingDriver) {
                            return (
                              <div className="flex items-center justify-between px-4 py-2.5 text-xs text-amber-600 dark:text-amber-300 bg-amber-500/8">
                                <div className="flex items-center gap-3">
                                  <Bike className="w-4 h-4 text-amber-500" />
                                  <span>Hồ sơ tài xế</span>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25">
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
                                className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                              >
                                <Bike className="w-4 h-4 text-primary" />
                                Đăng ký làm tài xế
                              </Link>
                            );
                          }

                          return null;
                        })()}

                        {/* Restaurant Section */}
                        {(() => {
                          const isApprovedRestaurant = Boolean(
                            user?.hasRestaurant ||
                              user?.restaurant ||
                              user?.restaurantRegistrationStatus === 'APPROVED',
                          );
                          const isPendingRestaurant =
                            !isApprovedRestaurant && user?.restaurantRegistrationStatus === 'PENDING';
                          const canRegisterRestaurant = !isApprovedRestaurant && !isPendingRestaurant;

                          if (isApprovedRestaurant) {
                            return (
                              <Link
                                href="/partner/restaurant"
                                onClick={() => setIsDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-2.5 text-xs text-primary hover:bg-primary/10 transition-colors font-semibold"
                              >
                                <Store className="w-4 h-4 text-primary" />
                                Quán của tôi (Đối tác)
                              </Link>
                            );
                          }

                          if (isPendingRestaurant) {
                            return (
                              <div className="flex items-center justify-between px-4 py-2.5 text-xs text-amber-600 dark:text-amber-300 bg-amber-500/8">
                                <div className="flex items-center gap-3">
                                  <Store className="w-4 h-4 text-amber-500" />
                                  <span>Hồ sơ mở quán</span>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25">
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
                                className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                              >
                                <Store className="w-4 h-4 text-muted-foreground" />
                                Đăng ký mở quán
                              </Link>
                            );
                          }

                          return null;
                        })()}

                        <div className="h-px bg-border my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          {tNav('logout')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-bold text-foreground bg-secondary hover:bg-primary hover:text-primary-foreground border border-border transition-all duration-150"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tNav('login')}</span>
                  </Link>
                )}
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-xl bg-card border border-border text-foreground hover:bg-secondary cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
            </button>
          </div>
        </nav>

        {/* Mobile Nav Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card px-4 py-3 space-y-2 animate-in">
            <button
              type="button"
              onClick={() => {
                setIsLocationModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-secondary/70 border border-border text-left text-xs"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase text-primary block">
                  {tNav('deliverTo')}
                </span>
                <span className="font-medium text-foreground truncate block">
                  {currentLocation.address}
                </span>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const active = isActiveLink(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/60 text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
      />
    </>
  );
}
