"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Camera,
  User as UserIcon,
  Mail,
  Shield,
  MapPin,
  Package,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Store,
  Bike,
  Sparkles,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, uploadUserAvatar } from '@/features/auth';
import { CustomerLayout } from '@/components/layout/customer-layout/customer-layout';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout, updateAvatar, refreshProfile } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/profile');
      return;
    }
    void refreshProfile();
  }, [_hasHydrated, isAuthenticated, router, refreshProfile]);

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh đại diện không được vượt quá 5MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Định dạng tệp không hợp lệ. Vui lòng chọn ảnh JPG, PNG, WEBP hoặc GIF');
      return;
    }

    setIsUploading(true);
    const loadingToastId = toast.loading('Đang tải ảnh đại diện lên S3...');

    try {
      const res = await uploadUserAvatar(file);
      updateAvatar(res.avatar_url);
      toast.success('Cập nhật ảnh đại diện thành công!', { id: loadingToastId });
    } catch (err: unknown) {
      console.error('Avatar upload error:', err);
      const message =
        err instanceof Error ? err.message : 'Không thể tải ảnh đại diện. Vui lòng thử lại.';
      toast.error(message, { id: loadingToastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất');
    router.push('/login');
  };

  if (!_hasHydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const roleLabel =
    user.role === 'ADMIN'
      ? 'Quản trị viên'
      : user.hasRestaurant
      ? 'Đối tác nhà hàng'
      : user.hasDriver
      ? 'Tài xế đối tác'
      : 'Khách hàng thân thiết';

  return (
    <CustomerLayout>
      <div className="min-h-screen bg-background text-foreground pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 space-y-6">
          {/* Navigation Bar & Profile Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card hover:bg-secondary text-foreground border border-border transition-colors text-xs sm:text-sm font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang chủ</span>
            </Link>

            <div className="flex items-center gap-1.5 bg-card p-1 rounded-xl border border-border text-xs font-semibold">
              <Link
                href="/profile"
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground"
              >
                Thông tin
              </Link>
              <Link
                href="/profile/addresses"
                className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              >
                Sổ địa chỉ
              </Link>
              <Link
                href="/rewards"
                className="px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
              >
                Điểm thưởng
              </Link>
            </div>
          </div>

          {/* Profile Card */}
          <div className="relative rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar with Camera upload trigger */}
              <div className="relative group shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  aria-label="Đổi ảnh đại diện"
                  className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-secondary border-2 border-primary/40 hover:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all duration-300 group cursor-pointer shadow-md"
                >
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || 'Avatar'}
                      fill
                      sizes="128px"
                      priority
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/12 text-primary font-heading font-extrabold text-3xl">
                      {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-12 h-12" />}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-medium">
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6" />
                        <span>Đổi ảnh</span>
                      </>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer border-2 border-card"
                  title="Tải ảnh đại diện mới"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Profile Info Details */}
              <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight truncate">
                    {user.name || 'Người dùng FoodDelivery'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary/12 text-primary border border-primary/25">
                    <Shield className="w-3.5 h-3.5" />
                    {roleLabel}
                  </span>
                </div>

                <p className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </p>

                <div className="pt-2 inline-flex items-center gap-1.5 text-xs text-primary font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tài khoản đã xác thực</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Menu Actions */}
          <div className="rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden shadow-xs">
            <Link
              href="/profile/addresses"
              className="flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/60 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/12 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Sổ địa chỉ nhận hàng</h2>
                  <p className="text-xs text-muted-foreground">Quản lý các địa chỉ giao hàng thường dùng</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/history"
              className="flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/60 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/12 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Lịch sử đơn hàng</h2>
                  <p className="text-xs text-muted-foreground">Xem và theo dõi trạng thái các đơn hàng đã đặt</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            <Link
              href="/rewards"
              className="flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/60 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Điểm thưởng & Hạng hội viên</h2>
                  <p className="text-xs text-muted-foreground">Đổi điểm tích lũy lấy ưu đãi giảm giá trực tiếp</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>

            {user.hasRestaurant && (
              <Link
                href="/partner/restaurant"
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/60 transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-primary/12 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Kênh quản lý đối tác quán ăn</h2>
                    <p className="text-xs text-muted-foreground">Quản lý thực đơn, ảnh món và đơn bếp</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            )}

            {user.hasDriver && (
              <Link
                href="/driver/dashboard"
                className="flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/60 transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Kênh tài xế giao hàng</h2>
                    <p className="text-xs text-muted-foreground">Xem đơn giao và cập nhật trạng thái làm việc</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-destructive/8 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-destructive/12 text-destructive flex items-center justify-center group-hover:scale-105 transition-transform">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-destructive">Đăng xuất</span>
                  <p className="text-xs text-muted-foreground">Thoát tài khoản khỏi phiên làm việc hiện tại</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
