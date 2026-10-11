'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export default function RegistrationPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      type: 'DRIVER',
      vehicle_plate: '',
      restaurant_name: '',
      address: '',
    }
  });

  const type = watch('type');

  const mutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return apiClient('/users/registrations', {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      toast.success('Gửi yêu cầu đăng ký thành công!');
      router.push('/');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const onSubmit = (data: Record<string, unknown>) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập trước khi đăng ký');
      return router.push('/login');
    }

    const payload = type === 'DRIVER' 
      ? { vehicle_plate: data.vehicle_plate } 
      : { restaurant_name: data.restaurant_name, address: data.address };

    mutation.mutate({
      type: data.type,
      payload
    });
  };

  return (
    <div className="max-w-xl mx-auto mt-20 p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl">
      <h1 className="text-3xl font-bold text-orange-500 mb-6 text-center">Đăng ký Đối tác</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-zinc-300 font-medium mb-2">Loại đăng ký</label>
          <select 
            {...register('type')}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="DRIVER">Tài xế (Driver)</option>
            <option value="RESTAURANT">Nhà hàng (Restaurant)</option>
          </select>
        </div>

        {type === 'DRIVER' ? (
          <div>
            <label className="block text-zinc-300 font-medium mb-2">Biển số xe</label>
            <input 
              {...register('vehicle_plate', { required: type === 'DRIVER' ? 'Vui lòng nhập biển số xe' : false })}
              placeholder="VD: 59-X1 12345"
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {errors.vehicle_plate && <p className="text-red-500 text-sm mt-1">{errors.vehicle_plate?.message as string}</p>}
          </div>
        ) : (
          <>
            <div>
              <label className="block text-zinc-300 font-medium mb-2">Tên nhà hàng</label>
              <input 
                {...register('restaurant_name', { required: type === 'RESTAURANT' ? 'Vui lòng nhập tên nhà hàng' : false })}
                placeholder="Tên quán của bạn"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {errors.restaurant_name && <p className="text-red-500 text-sm mt-1">{errors.restaurant_name?.message as string}</p>}
            </div>
            <div>
              <label className="block text-zinc-300 font-medium mb-2">Địa chỉ</label>
              <input 
                {...register('address', { required: type === 'RESTAURANT' ? 'Vui lòng nhập địa chỉ' : false })}
                placeholder="Địa chỉ nhà hàng"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address?.message as string}</p>}
            </div>
          </>
        )}

        <button 
          type="submit" 
          disabled={mutation.isPending}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Đang gửi...' : 'Gửi Yêu Cầu'}
        </button>
      </form>
    </div>
  );
}
