"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  type UserAddress,
  type CreateAddressInput,
  AddressCard,
  AddressFormModal,
} from '@/features/address';
import {
  MapPin,
  Plus,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddressBookPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshList = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/profile/addresses');
      return;
    }

    let active = true;
    getUserAddresses()
      .then((data) => {
        if (active) {
          setAddresses(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          console.error('Failed to load addresses:', err);
          toast.error('Không thể tải danh sách địa chỉ. Vui lòng thử lại.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, _hasHydrated, router, refreshKey]);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr: UserAddress) => {
    setEditingAddress(addr);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (input: CreateAddressInput) => {
    try {
      if (editingAddress) {
        await updateAddress(editingAddress.id, input);
        toast.success('Đã cập nhật địa chỉ thành công!');
      } else {
        await createAddress(input);
        toast.success('Đã thêm địa chỉ mới thành công!');
      }
      refreshList();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu địa chỉ.';
      toast.error(msg);
      throw err;
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      toast.success('Đã đổi địa chỉ mặc định!');
      refreshList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đặt làm mặc định.';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    try {
      await deleteAddress(id);
      toast.success('Đã xóa địa chỉ thành công!');
      refreshList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa địa chỉ.';
      toast.error(msg);
    }
  };

  if (!_hasHydrated || (isLoading && addresses.length === 0)) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-zinc-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          <p className="text-sm">Đang tải sổ địa chỉ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Quay lại trang chủ
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-zinc-900/90 to-zinc-900/50 border border-zinc-800 shadow-xl backdrop-blur-md mb-8">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400 rounded-2xl shadow-inner">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Sổ địa chỉ của tôi</h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Quản lý các địa điểm giao nhận thường dùng và định vị tọa độ chuẩn xác
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-medium shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Thêm địa chỉ mới
          </button>
        </div>

        {/* Address Cards List */}
        {addresses.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto mb-4 text-zinc-500">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white">Bạn chưa lưu địa chỉ nào</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1.5 mb-6">
              Lưu lại địa chỉ nhà riêng, công ty để đặt món nhanh chóng hơn và được tính toán lộ trình giao hàng tối ưu nhất.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium transition-all shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              Thêm địa chỉ đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={handleOpenEditModal}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <AddressFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveAddress}
        initialData={editingAddress}
        defaultRecipientName={user?.name || ''}
        defaultRecipientPhone={(user?.customerProfile?.phone as string) || ''}
      />
    </div>
  );
}
