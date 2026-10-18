"use client";

import React from 'react';
import type { UserAddress } from '@/features/address/types/address.types';
import { Home, Briefcase, MapPin, Check, Trash2, Edit3, Phone, User } from 'lucide-react';

interface AddressCardProps {
  address: UserAddress;
  onSelect?: (address: UserAddress) => void;
  onEdit?: (address: UserAddress) => void;
  onDelete?: (id: string) => void;
  onSetDefault?: (id: string) => void;
  isSelected?: boolean;
  selectable?: boolean;
}

export function AddressCard({
  address,
  onSelect,
  onEdit,
  onDelete,
  onSetDefault,
  isSelected = false,
  selectable = false,
}: AddressCardProps) {
  const getLabelInfo = (label: string) => {
    switch (label) {
      case 'HOME':
        return { text: 'Nhà riêng', icon: Home, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'WORK':
        return { text: 'Cơ quan', icon: Briefcase, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      default:
        return { text: 'Khác', icon: MapPin, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    }
  };

  const labelInfo = getLabelInfo(address.label);
  const LabelIcon = labelInfo.icon;

  return (
    <div
      onClick={() => selectable && onSelect && onSelect(address)}
      className={`group relative p-4 rounded-xl border transition-all duration-200 ${
        selectable ? 'cursor-pointer hover:border-orange-500/60' : ''
      } ${
        isSelected
          ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500'
          : address.is_default
          ? 'bg-zinc-900/80 border-emerald-500/40 hover:border-emerald-500/60'
          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Top Header: Label & Default Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${labelInfo.color}`}
          >
            <LabelIcon className="w-3.5 h-3.5" />
            {labelInfo.text}
          </span>
          {address.is_default && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Check className="w-3 h-3" />
              Mặc định
            </span>
          )}
        </div>

        {/* Action Controls for Management Page */}
        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          {onSetDefault && !address.is_default && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSetDefault(address.id);
              }}
              className="text-xs text-zinc-400 hover:text-emerald-400 px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors"
            >
              Đặt mặc định
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              title="Chỉnh sửa địa chỉ"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(address);
              }}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              title="Xóa địa chỉ"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(address.id);
              }}
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Recipient Details */}
      <div className="flex items-center gap-3 text-sm text-zinc-200 font-medium mb-1.5">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-zinc-400" />
          {address.recipient_name}
        </span>
        <span className="text-zinc-500">|</span>
        <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
          <Phone className="w-3 h-3" />
          {address.recipient_phone}
        </span>
      </div>

      {/* Street & Full Address */}
      <div className="flex items-start gap-2 text-xs text-zinc-400 leading-relaxed mb-2">
        <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
        <span className="text-zinc-300 font-normal">{address.full_address}</span>
      </div>

      {/* Delivery Notes */}
      {address.delivery_notes && (
        <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 italic">
          <span className="text-zinc-500 not-italic font-medium">Ghi chú: </span>
          {address.delivery_notes}
        </div>
      )}
    </div>
  );
}
