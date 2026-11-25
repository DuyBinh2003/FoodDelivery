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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="p-8 max-w-md w-full bg-card border border-border rounded-2xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
            {user?.role === 'ADMIN' ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <h2 className="text-lg font-bold text-foreground">Kiểm Soát Quyền Truy Cập</h2>
          <p className="text-sm text-muted-foreground">{blockMessage || 'Đang xác thực quyền hạn...'}</p>
          <div className="w-6 h-6 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
