"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitDriverRegistration } from '@/features/driver/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bike, Phone, User, FileText, CheckCircle2, CreditCard } from 'lucide-react';

export function RegisterDriverForm() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    vehicle_plate: '',
    vehicle_type: 'Xe máy (2 bánh)',
    license_number: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!formData.full_name.trim() || !formData.phone.trim() || !formData.vehicle_plate.trim()) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
      setLoading(false);
      return;
    }

    try {
      await submitDriverRegistration(formData);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3500);
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      const errorMessage = errorObj.data?.message || errorObj.message || 'Có lỗi xảy ra khi gửi yêu cầu đăng ký.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/10">
          <CheckCircle2 className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Đăng ký thành công!</h2>
        <p className="text-zinc-400 mb-6 max-w-md">
          Hồ sơ đối tác tài xế của bạn đã được gửi tới Ban quản trị. Chúng tôi sẽ xét duyệt và kích hoạt tài khoản của bạn trong thời gian sớm nhất.
        </p>
        <p className="text-sm text-zinc-500">Đang tự động chuyển hướng về trang chủ...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-sm animate-in fade-in slide-in-from-top-2 flex items-start gap-3">
          <div className="mt-0.5">⚠️</div>
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      <div className="space-y-4">
        {/* Họ và tên */}
        <div className="space-y-2 relative">
          <Label htmlFor="full_name" className="text-zinc-300 font-medium text-sm">
            Họ và tên tài xế <span className="text-amber-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              className="pl-11 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-amber-500 rounded-xl py-2.5"
              disabled={loading}
            />
          </div>
        </div>

        {/* Số điện thoại */}
        <div className="space-y-2 relative">
          <Label htmlFor="phone" className="text-zinc-300 font-medium text-sm">
            Số điện thoại liên hệ <span className="text-amber-500">*</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="09xx xxx xxx"
              className="pl-11 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-amber-500 rounded-xl py-2.5"
              disabled={loading}
            />
          </div>
        </div>

        {/* Biển số xe & Loại xe */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 relative">
            <Label htmlFor="vehicle_plate" className="text-zinc-300 font-medium text-sm">
              Biển số phương tiện <span className="text-amber-500">*</span>
            </Label>
            <div className="relative">
              <Bike className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <Input
                id="vehicle_plate"
                name="vehicle_plate"
                value={formData.vehicle_plate}
                onChange={handleChange}
                placeholder="VD: 59-X1 123.45"
                className="pl-11 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-amber-500 rounded-xl py-2.5 uppercase font-mono"
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle_type" className="text-zinc-300 font-medium text-sm">
              Loại phương tiện <span className="text-amber-500">*</span>
            </Label>
            <select
              id="vehicle_type"
              name="vehicle_type"
              value={formData.vehicle_type}
              onChange={handleChange}
              disabled={loading}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Xe máy (2 bánh)">Xe máy (2 bánh)</option>
              <option value="Xe máy điện">Xe máy điện</option>
              <option value="Xe ô tô / Bán tải">Xe ô tô / Bán tải</option>
              <option value="Khác">Phương tiện khác</option>
            </select>
          </div>
        </div>

        {/* Số CCCD / Giấy phép lái xe */}
        <div className="space-y-2 relative">
          <Label htmlFor="license_number" className="text-zinc-300 font-medium text-sm">
            Số CCCD / Giấy phép lái xe (GPLX)
          </Label>
          <div className="relative">
            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
            <Input
              id="license_number"
              name="license_number"
              value={formData.license_number}
              onChange={handleChange}
              placeholder="Nhập 12 số CCCD hoặc mã GPLX"
              className="pl-11 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-amber-500 rounded-xl py-2.5 font-mono"
              disabled={loading}
            />
          </div>
        </div>

        {/* Ghi chú thêm */}
        <div className="space-y-2 relative">
          <Label htmlFor="notes" className="text-zinc-300 font-medium text-sm">
            Khu vực hoạt động & Ghi chú (không bắt buộc)
          </Label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 h-5 w-5 text-zinc-500" />
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="VD: Nhận đơn chủ yếu quận Cầu Giấy, Nam Từ Liêm; thời gian rảnh buổi tối..."
              className="w-full min-h-[90px] pl-11 pt-3 pb-3 pr-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6 rounded-xl text-base font-semibold transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99]"
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Đang gửi hồ sơ...
          </span>
        ) : (
          'Gửi yêu cầu gia nhập tài xế'
        )}
      </Button>
    </form>
  );
}
