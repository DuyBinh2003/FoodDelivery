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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md h-full bg-card border-l border-border p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/15 text-primary border border-primary/25">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Trung tâm Thông báo</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-secondary hover:bg-white/[0.08] text-zinc-400 hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1">
              {(['all', 'promo', 'order'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-secondary text-secondary-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'all' ? 'Tất cả' : tab === 'promo' ? 'Khuyến mãi' : 'Đơn hàng'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-[11px] text-zinc-400 hover:text-primary font-medium cursor-pointer transition-colors"
            >
              Đã đọc tất cả
            </button>
          </div>

          {/* List */}
          <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                Không có thông báo nào trong mục này.
              </div>
            ) : (
              filteredNotifs.map((item) => (
                <Link
                  key={item.id}
                  href={item.link || '#'}
                  onClick={onClose}
                  className={`block p-3 rounded-xl border transition-colors ${
                    !item.isRead
                      ? 'bg-primary/[0.03] border-primary/30'
                      : 'bg-card/40 border-border text-muted-foreground'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.type === 'promo'
                          ? 'bg-primary/15 text-primary border border-primary/25'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      }`}
                    >
                      {item.type === 'promo' ? (
                        <Tag className="w-3.5 h-3.5" />
                      ) : (
                        <Package className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-xs text-foreground truncate">{item.title}</h4>
                        <span className="text-[10px] text-zinc-500 shrink-0">{item.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
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
        <div className="pt-3.5 border-t border-border text-center">
          <Link
            href="/rewards"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <span>Xem thêm ưu đãi tích điểm thành viên</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
