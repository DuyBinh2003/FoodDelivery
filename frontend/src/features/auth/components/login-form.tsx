'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { Eye, EyeOff, Mail, Lock, UtensilsCrossed } from 'lucide-react';
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
      const profile = await apiClient('/users/profile', {
        headers: {
          Authorization: `Bearer ${data.access_token}`
        }
      }) as {
        id: string;
        email: string;
        role: 'USER' | 'ADMIN';
        customerProfile?: Record<string, unknown>;
        driverProfile?: Record<string, unknown>
      };

      // 4. Update auth store
      useAuthStore.getState().login({
        id: profile.id,
        email: profile.email,
        name: (profile.customerProfile?.full_name as string) || profile.email,
        role: profile.role,
        customerProfile: profile.customerProfile,
        driverProfile: profile.driverProfile,
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
      <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-600 rounded-[32px] blur-xl opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200" />

      <Card className="relative bg-zinc-950/80 backdrop-blur-xl border-white/10 shadow-2xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 mb-4 shadow-lg shadow-orange-500/25">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            FoodDelivery
          </CardTitle>
          <CardDescription className="text-zinc-400 mt-2">
            Đăng nhập để đặt món ngon giao tận nơi
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="pl-10 h-11 bg-white/5 border-white/10 focus-visible:ring-orange-500/50 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-300">Mật khẩu</Label>
                <Button variant="link" type="button" className="px-0 h-auto text-xs text-orange-400 hover:text-orange-300">
                  Quên mật khẩu?
                </Button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 h-11 bg-white/5 border-white/10 focus-visible:ring-orange-500/50 rounded-xl"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg shadow-orange-500/25 transition-all duration-300 font-semibold"
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

        <CardFooter className="flex flex-col gap-4 pb-8">
          <div className="relative flex items-center w-full gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-zinc-500 uppercase font-medium">hoặc</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <p className="text-center text-sm text-zinc-400">
            Chưa có tài khoản?{' '}
            <Button variant="link" className="px-0 text-orange-400 hover:text-orange-300 font-medium">
              Đăng ký ngay
            </Button>
          </p>

          <div className="mt-2 w-full bg-orange-500/5 rounded-xl p-3 border border-orange-500/10">
            <p className="text-xs text-zinc-400 text-center font-mono">
              🔑 Demo: customer@fooddelivery.com / password123
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
