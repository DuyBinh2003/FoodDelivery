'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export function RoleRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  const isAdminRoute = Boolean(pathname?.startsWith('/admin'));
  const isLoginRoute = pathname === '/login';

  // Compute block state directly from auth state and current route
  const isBlocked = _hasHydrated && (
    (isAuthenticated && user?.role === 'ADMIN' && !isAdminRoute && !isLoginRoute) ||
    (isAdminRoute && (!isAuthenticated || user?.role !== 'ADMIN'))
  );

  const blockMessage = !isBlocked
    ? null
    : isAuthenticated && user?.role === 'ADMIN'
    ? 'Tài khoản Quản trị viên chỉ hoạt động trên Cổng Admin. Đang chuyển hướng...'
    : !isAuthenticated
    ? 'Vui lòng đăng nhập với tư cách Quản trị viên...'
    : 'Bạn không có quyền truy cập Cổng Quản trị viên. Đang quay lại trang chủ...';

  useEffect(() => {
    if (!isBlocked) return;

    if (isAuthenticated && user?.role === 'ADMIN' && !isAdminRoute && !isLoginRoute) {
      router.replace('/admin/dashboard');
    } else if (isAdminRoute) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (user?.role !== 'ADMIN') {
        router.replace('/');
      }
    }
  }, [isBlocked, isAuthenticated, user, isAdminRoute, isLoginRoute, router]);

  // If blocked from current route, prevent content leak
  if (_hasHydrated && isBlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-4">
        <div className="p-8 max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 animate-pulse">
            {user?.role === 'ADMIN' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <h2 className="text-lg font-bold text-white">Kiểm Soát Quyền Truy Cập</h2>
          <p className="text-sm text-zinc-400">{blockMessage || 'Đang xác thực quyền hạn...'}</p>
          <div className="w-6 h-6 mx-auto border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
