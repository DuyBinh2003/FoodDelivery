'use client';

import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Wallet, ShoppingBag, Users, Store, CheckSquare, Settings, LogOut } from 'lucide-react';
import { AdminSocketProvider } from '@/components/providers/admin-socket-provider';

const ADMIN_NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/wallet', label: 'Ví & Doanh thu', icon: Wallet },
  { href: '/admin/orders', label: 'Đơn hàng & Cuốc xe', icon: ShoppingBag },
  { href: '/admin/users', label: 'Người dùng & Tài xế', icon: Users },
  { href: '/admin/restaurants', label: 'Nhà hàng đối tác', icon: Store },
  { href: '/admin/approvals', label: 'Xét duyệt hồ sơ', icon: CheckSquare },
  { href: '/admin/settings', label: 'Cài đặt hệ thống', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    if (!_hasHydrated) return;
    
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'ADMIN') {
      router.push('/');
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  if (!_hasHydrated || !isAuthenticated || user?.role !== 'ADMIN') {
    return <div className="min-h-screen flex items-center justify-center text-zinc-400">Đang kiểm tra quyền...</div>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6">
          <h2 className="text-lg font-bold text-primary tracking-tight">Food Admin</h2>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors text-xs sm:text-sm ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-semibold' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-3 w-full px-3.5 py-2.5 text-xs sm:text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-14 flex items-center justify-end px-8 border-b border-border bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow-sm">
              {(user?.name || user?.email || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs sm:text-sm font-medium text-foreground">{user?.name || user?.email}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-6xl mx-auto">
            <AdminSocketProvider>
              {children}
            </AdminSocketProvider>
          </div>
        </div>
      </main>
    </div>
  );
}
