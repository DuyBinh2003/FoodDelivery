'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
      const data = (await apiClient('/auth/login', {
        method: 'POST',
        body: { email, password },
      })) as { access_token: string; refresh_token?: string; user: Record<string, unknown> };

      document.cookie = `access_token=${data.access_token}; path=/; max-age=${15 * 60}; SameSite=Lax`;
      if (data.refresh_token) {
        document.cookie = `refresh_token=${data.refresh_token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
      }

      const profile = await apiClient<User>('/users/profile', {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md mx-auto relative"
    >
      <Card className="bg-card border border-border shadow-xl rounded-3xl overflow-hidden text-card-foreground">
        <CardHeader className="text-center pb-5 pt-8">
          <div className="mx-auto inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground mb-3 shadow-md shadow-primary/25">
            <UtensilsCrossed className="w-7 h-7" />
          </div>
          <CardTitle className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Food<span className="text-primary">Delivery</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm mt-1">
            Đăng nhập để đặt món ngon giao tận nơi
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/12 border border-destructive/25 text-destructive px-4 py-3 rounded-xl text-sm animate-in flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive shrink-0 animate-pulse" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground text-sm font-semibold">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-10 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground text-sm font-semibold">
                  Mật khẩu
                </Label>
                <Button
                  variant="link"
                  type="button"
                  className="px-0 h-auto text-xs text-primary font-semibold"
                >
                  Quên mật khẩu?
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 h-11 rounded-xl"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-lg"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-bold text-base"
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

        <CardFooter className="flex flex-col gap-4 pb-8 pt-2 px-6 sm:px-8 bg-transparent border-t-0">
          <div className="relative flex items-center w-full gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              hoặc
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link
              href="/register"
              className="text-primary font-bold hover:underline"
            >
              Đăng ký ngay
            </Link>
          </p>

          <div className="w-full bg-secondary/60 rounded-2xl p-3.5 border border-border">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                Tài khoản thử nghiệm
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                Bấm để điền nhanh
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('customer@fooddelivery.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-card hover:bg-primary/10 border border-border hover:border-primary/40 text-left transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-primary block">Khách hàng</span>
                <span className="text-[11px] text-muted-foreground truncate block font-mono">
                  customer@...
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('admin@fooddelivery.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-card hover:bg-primary/10 border border-border hover:border-primary/40 text-left transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-destructive block">Quản trị viên</span>
                <span className="text-[11px] text-muted-foreground truncate block font-mono">
                  admin@...
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('owner@phobien.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-card hover:bg-primary/10 border border-border hover:border-primary/40 text-left transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-foreground block">Nhà hàng Phở Biên</span>
                <span className="text-[11px] text-muted-foreground truncate block font-mono">
                  owner@phobien.com
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('driver1@fooddelivery.com');
                  setPassword('password123');
                }}
                className="p-2.5 rounded-xl bg-card hover:bg-primary/10 border border-border hover:border-primary/40 text-left transition-all cursor-pointer"
              >
                <span className="text-xs font-bold text-foreground block">Tài xế 1</span>
                <span className="text-[11px] text-muted-foreground truncate block font-mono">
                  driver1@fooddelivery.com
                </span>
              </button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
