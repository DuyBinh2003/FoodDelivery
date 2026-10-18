"use client";

import React, { useState } from 'react';
import type { UserAddress, CreateAddressInput, AddressLabel } from '@/features/address/types/address.types';
import { LocationMapPicker } from './LocationMapPicker';
import { X, Home, Briefcase, MapPin, Loader2, Check } from 'lucide-react';

interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAddressInput) => Promise<void>;
  initialData?: UserAddress | null;
  defaultRecipientName?: string;
  defaultRecipientPhone?: string;
}

function AddressFormInner({
  onClose,
  onSubmit,
  initialData,
  defaultRecipientName = '',
  defaultRecipientPhone = '',
}: Omit<AddressFormModalProps, 'isOpen'>) {
  const [recipientName, setRecipientName] = useState(
    initialData?.recipient_name ?? defaultRecipientName,
  );
  const [recipientPhone, setRecipientPhone] = useState(
    initialData?.recipient_phone ?? defaultRecipientPhone,
  );
  const [label, setLabel] = useState<AddressLabel>(initialData?.label ?? 'HOME');
  const [streetAddress, setStreetAddress] = useState(initialData?.street_address ?? '');
  const [ward, setWard] = useState(initialData?.ward ?? '');
  const [district, setDistrict] = useState(initialData?.district ?? '');
  const [city, setCity] = useState(initialData?.city ?? '');
  const [fullAddress, setFullAddress] = useState(initialData?.full_address ?? '');
  const [latitude, setLatitude] = useState(
    initialData?.latitude ? Number(initialData.latitude) : 10.77653,
  );
  const [longitude, setLongitude] = useState(
    initialData?.longitude ? Number(initialData.longitude) : 106.70098,
  );
  const [deliveryNotes, setDeliveryNotes] = useState(initialData?.delivery_notes ?? '');
  const [isDefault, setIsDefault] = useState(initialData?.is_default ?? false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLocationPicked = (loc: {
    lat: number;
    lng: number;
    formattedAddress?: string;
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
  }) => {
    setLatitude(loc.lat);
    setLongitude(loc.lng);
    if (loc.formattedAddress) {
      setFullAddress(loc.formattedAddress);
    }
    if (loc.street) {
      setStreetAddress(loc.street);
    }
    if (loc.ward) {
      setWard(loc.ward);
    }
    if (loc.district) {
      setDistrict(loc.district);
    }
    if (loc.city) {
      setCity(loc.city);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!recipientName.trim()) {
      setErrorMessage('Vui lòng nhập họ tên người nhận.');
      return;
    }
    if (!recipientPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại người nhận.');
      return;
    }
    if (!fullAddress.trim()) {
      setErrorMessage('Vui lòng ghim vị trí hoặc nhập địa chỉ giao hàng.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        label,
        street_address: streetAddress.trim() || fullAddress.split(',')[0] || fullAddress,
        ward: ward.trim() || undefined,
        district: district.trim() || undefined,
        city: city.trim() || undefined,
        full_address: fullAddress.trim(),
        latitude,
        longitude,
        delivery_notes: deliveryNotes.trim() || undefined,
        is_default: isDefault,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi lưu địa chỉ.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {initialData ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
              </h2>
              <p className="text-xs text-zinc-400">Ghim vị trí trên bản đồ để tính toán chia cuốc chính xác</p>
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

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
              {errorMessage}
            </div>
          )}

          {/* Map Picker */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">
              Vị trí trên bản đồ <span className="text-orange-400">*</span>
            </label>
            <LocationMapPicker
              initialLat={latitude}
              initialLng={longitude}
              onLocationSelect={handleLocationPicked}
            />
          </div>

          {/* Full Address Input */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Địa chỉ đầy đủ <span className="text-orange-400">*</span>
            </label>
            <textarea
              rows={2}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, thành phố..."
              className="w-full px-3.5 py-2.5 text-xs bg-zinc-800/60 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Tên người nhận <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 text-xs bg-zinc-800/60 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Số điện thoại <span className="text-orange-400">*</span>
              </label>
              <input
                type="text"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder="0901234567"
                className="w-full px-3.5 py-2.5 text-xs bg-zinc-800/60 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Label Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-2">Nhãn địa chỉ</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setLabel('HOME')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  label === 'HOME'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-sm'
                    : 'bg-zinc-800/40 border-zinc-750 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Nhà riêng
              </button>
              <button
                type="button"
                onClick={() => setLabel('WORK')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  label === 'WORK'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-sm'
                    : 'bg-zinc-800/40 border-zinc-750 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Cơ quan
              </button>
              <button
                type="button"
                onClick={() => setLabel('OTHER')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  label === 'OTHER'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                    : 'bg-zinc-800/40 border-zinc-750 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Khác
              </button>
            </div>
          </div>

          {/* Delivery Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Ghi chú cho tài xế (Tùy chọn)
            </label>
            <input
              type="text"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="Ví dụ: Tòa B, lầu 3, gọi trước khi giao..."
              className="w-full px-3.5 py-2.5 text-xs bg-zinc-800/60 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Default Address Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer pt-1 group/chk">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 transition-colors"
            />
            <span className="text-xs text-zinc-300 group-hover/chk:text-white transition-colors">
              Đặt làm địa chỉ nhận hàng mặc định
            </span>
          </label>

          {/* Footer Submit Button */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {initialData ? 'Cập nhật' : 'Lưu địa chỉ'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddressFormModal(props: AddressFormModalProps) {
  if (!props.isOpen) return null;
  return (
    <AddressFormInner
      key={props.initialData?.id || 'new-address-form'}
      onClose={props.onClose}
      onSubmit={props.onSubmit}
      initialData={props.initialData}
      defaultRecipientName={props.defaultRecipientName}
      defaultRecipientPhone={props.defaultRecipientPhone}
    />
  );
}

