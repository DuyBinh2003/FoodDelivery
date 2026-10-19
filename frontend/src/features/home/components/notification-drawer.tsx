'use client';

import React, { useState } from 'react';
import { Bell, Tag, Package, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: 'promo' | 'order';
  title: string;
  content: string;
  time: string;
  isRead: boolean;
  link?: string;
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'promo',
    title: 'Tặng bạn mã FREESHIP đơn từ 0Đ',
    content: 'Áp dụng cho mọi nhà hàng trong bán kính 5km. Hạn dùng đến 23:59 hôm nay!',
    time: '15 phút trước',
    isRead: false,
    link: '/menu?promo=freeship',
  },
  {
    id: 'notif-2',
    type: 'order',
    title: 'Đơn hàng đang trên đường giao đến bạn',
    content: 'Tài xế Nguyễn Văn A đang di chuyển cách bạn 1.2km (dự kiến đến sau 5 phút).',
    time: '30 phút trước',
    isRead: false,
    link: '/history',
  },
  {
    id: 'notif-3',
    type: 'promo',
    title: 'Giảm 50% tiệc trà chiều',
    content: 'Khai tiệc trà sữa cùng bạn bè với ưu đãi giảm nửa giá từ các thương hiệu hàng đầu.',
    time: '2 giờ trước',
    isRead: true,
    link: '/menu?category=tra-sua',
  },
];

export function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'promo' | 'order'>('all');
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  });

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-zinc-950 border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Trung tâm Thông báo</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              {(['all', 'promo', 'order'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab === 'all' ? 'Tất cả' : tab === 'promo' ? 'Khuyến mãi' : 'Đơn hàng'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] text-zinc-400 hover:text-amber-400 font-medium cursor-pointer"
            >
              Đã đọc tất cả
            </button>
          </div>

          {/* List */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 no-scrollbar">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Không có thông báo nào trong mục này.
              </div>
            ) : (
              filteredNotifs.map((item) => (
                <Link
                  key={item.id}
                  href={item.link || '#'}
                  onClick={onClose}
                  className={`block p-3.5 rounded-2xl border transition-all ${
                    !item.isRead
                      ? 'bg-zinc-900/90 border-amber-500/30'
                      : 'bg-zinc-900/40 border-white/5 opacity-80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        item.type === 'promo'
                          ? 'bg-red-500/15 text-red-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {item.type === 'promo' ? (
                        <Tag className="w-4 h-4" />
                      ) : (
                        <Package className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-white truncate">{item.title}</h4>
                        <span className="text-[10px] text-zinc-500">{item.time}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 text-center">
          <Link
            href="/rewards"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300"
          >
            <span>Xem thêm ưu đãi tích điểm thành viên</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
