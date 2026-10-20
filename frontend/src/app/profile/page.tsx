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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, uploadUserAvatar } from '@/features/auth';

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
    // Refresh profile in background to get latest S3 avatar_url if any
    void refreshProfile();
  }, [_hasHydrated, isAuthenticated, router, refreshProfile]);

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = '';

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh đại diện không được vượt quá 5MB');
      return;
    }

    // Validate type
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
      const message = err instanceof Error ? err.message : 'Không thể tải ảnh đại diện. Vui lòng thử lại.';
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
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
    <div className="min-h-screen bg-zinc-950 text-white pb-20 selection:bg-amber-500/30">
      {/* Background ambient accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-10 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Trang chủ</span>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Tài khoản FoodDelivery
          </span>
        </div>

        {/* Profile Card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-white/10 p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-xl">
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
                className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-zinc-800 border-2 border-amber-500/40 hover:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all duration-300 group cursor-pointer shadow-xl"
              >
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.name || 'Avatar'}
                    fill
                    sizes="128px"
                    priority
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 font-bold text-3xl">
                    {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-12 h-12" />}
                  </div>
                )}

                {/* Upload Hover Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-medium">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-amber-400" />
                      <span>Đổi ảnh S3</span>
                    </>
                  )}
                </div>
              </button>

              {/* Camera Badge Icon */}
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 shadow-lg hover:scale-110 active:scale-95 transition-transform cursor-pointer border border-black/40"
                title="Tải ảnh lên LocalStack S3"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <Camera className="w-4 h-4 text-zinc-950 font-bold" />
                )}
              </button>
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                  {user.name || 'Người dùng FoodDelivery'}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Shield className="w-3.5 h-3.5" />
                  {roleLabel}
                </span>
              </div>

              <p className="flex items-center justify-center sm:justify-start gap-2 text-sm text-zinc-400">
                <Mail className="w-4 h-4 text-zinc-500" />
                <span>{user.email}</span>
              </p>

              {user.avatar_url && (
                <div className="pt-2 text-xs text-zinc-500 truncate max-w-md">
                  <span className="text-zinc-400 font-medium">Lưu trữ:</span> S3 Bucket (food-delivery-assets)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Menu Actions */}
        <div className="rounded-3xl bg-zinc-900/80 border border-white/10 divide-y divide-white/5 overflow-hidden backdrop-blur-xl">
          <Link
            href="/profile/addresses"
            className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Sổ địa chỉ nhận hàng</h2>
                <p className="text-xs text-zinc-400">Quản lý các địa chỉ giao hàng thường dùng</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
          </Link>

          <Link
            href="/orders"
            className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Lịch sử đơn hàng</h2>
                <p className="text-xs text-zinc-400">Xem và theo dõi trạng thái các đơn hàng đã đặt</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
          </Link>

          {user.hasRestaurant && (
            <Link
              href="/partner"
              className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-orange-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Kênh quản lý đối tác quán ăn</h2>
                  <p className="text-xs text-zinc-400">Quản lý thực đơn, ảnh món và banner nhà hàng</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>
          )}

          {user.hasDriver && (
            <Link
              href="/driver"
              className="flex items-center justify-between p-4 sm:p-5 hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Kênh tài xế giao hàng</h2>
                  <p className="text-xs text-zinc-400">Xem đơn giao và cập nhật trạng thái làm việc</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
            </Link>
          )}

          {/* Logout Action */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-red-500/10 transition-colors text-left group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold text-red-400">Đăng xuất</span>
                <p className="text-xs text-zinc-500">Thoát tài khoản khỏi phiên làm việc hiện tại</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
