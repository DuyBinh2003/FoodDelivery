"use client";

import React, { useState } from 'react';
import type { UserAddress, CreateAddressInput } from '@/features/address/types/address.types';
import { AddressCard } from './AddressCard';
import { AddressFormModal } from './AddressFormModal';
import { createAddress } from '@/features/address/api/address-api';
import { X, Plus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddressSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: UserAddress[];
  selectedAddressId?: string;
  onSelectAddress: (address: UserAddress) => void;
  onRefreshAddresses: () => Promise<void>;
  defaultRecipientName?: string;
  defaultRecipientPhone?: string;
}

export function AddressSelectorModal({
  isOpen,
  onClose,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onRefreshAddresses,
  defaultRecipientName = '',
  defaultRecipientPhone = '',
}: AddressSelectorModalProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  if (!isOpen) return null;

  const handleCreateNewAddress = async (data: CreateAddressInput) => {
    try {
      const newAddr = await createAddress(data);
      toast.success('Đã thêm địa chỉ giao hàng mới!');
      await onRefreshAddresses();
      onSelectAddress(newAddr);
      setIsAddModalOpen(false);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu địa chỉ';
      toast.error(msg);
      throw err;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Chọn địa chỉ giao hàng</h2>
                <p className="text-xs text-zinc-400">Chọn địa chỉ đã lưu hoặc thêm địa chỉ mới</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action: Add new address button */}
          <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-orange-500/50 hover:border-orange-500 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 text-xs font-medium transition-all group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              Thêm địa chỉ giao hàng mới
            </button>
          </div>

          {/* Address List */}
          <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
            {addresses.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                  <MapPin className="w-6 h-6" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">Bạn chưa lưu địa chỉ nào</p>
                <p className="text-xs text-zinc-500 mt-1">Bấm nút phía trên để thêm địa chỉ giao hàng đầu tiên</p>
              </div>
            ) : (
              addresses.map((addr) => (
                <AddressCard
                  key={addr.id}
                  address={addr}
                  selectable
                  isSelected={addr.id === selectedAddressId}
                  onSelect={(selected) => {
                    onSelectAddress(selected);
                    onClose();
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Embedded Add Modal */}
      <AddressFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateNewAddress}
        defaultRecipientName={defaultRecipientName}
        defaultRecipientPhone={defaultRecipientPhone}
      />
    </>
  );
}
