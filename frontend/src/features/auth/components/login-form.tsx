'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, type User } from '@/features/auth/store/useAuthStore';
import { Eye, EyeOff, Mail, Lock, UtensilsCrossed, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Call login API
      const data = await apiClient('/auth/login', {
        method: 'POST',
        body: { email, password },
      }) as { access_token: string; user: Record<string, unknown> };

      // 2. Save token to cookies so other requests (Server or Client) can use it
      document.cookie = `access_token=${data.access_token}; path=/; max-age=${7 * 24 * 60 * 60}`;

      // 3. Fetch full user profile using the token
      const profile = await apiClient<User>('/users/profile', {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      // 4. Update auth store
      useAuthStore.getState().login({
        id: profile.id,
        email: profile.email,
        name: (profile.customerProfile?.full_name as string) || profile.email,
        role: profile.role,
        customerProfile: profile.customerProfile,
        driverProfile: profile.driverProfile,
        restaurant: profile.restaurant,
        hasDriver: profile.hasDriver,
        hasRestaurant: profile.hasRestaurant,
        driverRegistrationStatus: profile.driverRegistrationStatus,
        restaurantRegistrationStatus: profile.restaurantRegistrationStatus,
      });

      if (profile.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/menu');
      }
    } catch (err: unknown) {
      const errorData = err as { data?: { message?: string } };
      setError(errorData?.data?.message || 'Email hoặc mật khẩu không đúng.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative group">
      {/* Background glow for premium feel */}
      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-[32px] blur-xl opacity-60 group-hover:opacity-100 transition duration-500" />

      <Card className="relative bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 ring-1 ring-white/10 shadow-2xl shadow-black/80 rounded-3xl overflow-hidden text-zinc-100">
        <CardHeader className="text-center pb-6 pt-8">
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mb-4 shadow-xl shadow-orange-500/30 ring-4 ring-orange-500/10">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-400 via-amber-300 to-red-500 bg-clip-text text-transparent">
            FoodDelivery
          </CardTitle>
          <CardDescription className="text-zinc-400 text-sm mt-2 font-normal">
            Đăng nhập để đặt món ngon giao tận nơi
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200 text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-10 h-12 bg-zinc-950/70 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 hover:border-zinc-700 rounded-xl transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-200 text-sm font-medium">
                  Mật khẩu
                </Label>
                <Button
                  variant="link"
                  type="button"
                  className="px-0 h-auto text-xs text-orange-400 hover:text-orange-300 font-medium transition-colors"
                >
                  Quên mật khẩu?
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 h-12 bg-zinc-950/70 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 hover:border-zinc-700 rounded-xl transition-colors"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/25 active:scale-[0.99] transition-all duration-200 font-semibold text-base cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang xử lý...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pb-8 pt-0 px-6 sm:px-8 bg-transparent border-t-0">
          <div className="relative flex items-center w-full gap-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">hoặc</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <p className="text-center text-sm text-zinc-400">
            Chưa có tài khoản?{' '}
            <Link
              href="/register"
              className="text-orange-400 hover:text-orange-300 font-semibold transition-colors hover:underline"
            >
              Đăng ký ngay
            </Link>
          </p>

          <div className="w-full bg-zinc-950/60 rounded-2xl p-3.5 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-orange-400" />
                Tài khoản thử nghiệm
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Bấm để điền nhanh</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('customer@fooddelivery.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-orange-500/50 text-left transition-all duration-200 group focus:outline-none focus:ring-1 focus:ring-orange-500/50"
              >
                <span className="text-xs font-semibold text-orange-400 group-hover:text-orange-300 block">
                  Khách hàng
                </span>
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate block font-mono">
                  customer@...
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('admin@fooddelivery.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 text-left transition-all duration-200 group focus:outline-none focus:ring-1 focus:ring-red-500/50"
              >
                <span className="text-xs font-semibold text-red-400 group-hover:text-red-300 block">
                  Quản trị viên
                </span>
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate block font-mono">
                  admin@...
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('owner@phobien.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 text-left transition-all duration-200 group focus:outline-none focus:ring-1 focus:ring-red-500/50"
              >
                <span className="text-xs font-semibold text-red-400 group-hover:text-red-300 block">
                  Nhà hàng Phở Biên
                </span>
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate block font-mono">
                  owner@phobien.com
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('driver1@fooddelivery.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 text-left transition-all duration-200 group focus:outline-none focus:ring-1 focus:ring-red-500/50"
              >
                <span className="text-xs font-semibold text-red-400 group-hover:text-red-300 block">
                  Tài xế 1
                </span>
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 truncate block font-mono">
                  driver1@fooddelivery.com
                </span>
              </button>

            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
