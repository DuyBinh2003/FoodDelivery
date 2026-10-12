"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitRestaurantRegistration } from '@/features/restaurant/api';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, MapPin, Phone, FileText, CheckCircle2 } from 'lucide-react';

export function RegisterRestaurantForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    description: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!formData.name.trim() || !formData.address.trim() || !formData.phone.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      setLoading(false);
      return;
    }

    try {
      await submitRestaurantRegistration(formData);
      await useAuthStore.getState().refreshProfile();
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      const errorMessage = errorObj.data?.message || errorObj.message || 'Có lỗi xảy ra khi gửi đăng ký.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Đăng ký thành công!</h2>
        <p className="text-zinc-400 mb-6 max-w-md">
          Yêu cầu đăng ký nhà hàng của bạn đã được gửi. Đội ngũ FoodDelivery sẽ liên hệ với bạn trong thời gian sớm nhất để xác nhận.
        </p>
        <p className="text-sm text-zinc-500">Đang quay lại trang chủ...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2 relative">
          <Label htmlFor="name" className="text-zinc-300">Tên nhà hàng <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Nhập tên nhà hàng của bạn"
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="address" className="text-zinc-300">Địa chỉ <span className="text-red-500">*</span></Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="phone" className="text-zinc-300">Số điện thoại liên hệ <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="09xx xxx xxx"
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-orange-500"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2 relative">
          <Label htmlFor="description" className="text-zinc-300">Mô tả ngắn (không bắt buộc)</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-5 w-5 text-zinc-500" />
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Giới thiệu về nhà hàng, loại hình ẩm thực..."
              className="w-full min-h-[100px] pl-10 pt-3 pb-3 pr-3 rounded-md bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 text-sm transition-colors"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 rounded-xl text-lg font-medium transition-all"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Đang xử lý...
          </span>
        ) : (
          'Gửi yêu cầu đăng ký'
        )}
      </Button>
    </form>
  );
}
