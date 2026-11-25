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

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
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
    title: 'Theo dõi đơn hàng thời gian thực',
    content: 'Kiểm tra vị trí tài xế và tiến trình chế biến món ăn ngay tại trang lịch sử đơn.',
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
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS);

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  });

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in">
      <div className="w-full max-w-md h-full bg-card text-card-foreground border-l border-border p-6 flex flex-col justify-between shadow-2xl">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/12 text-primary border border-primary/20">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="font-heading text-sm font-bold text-foreground tracking-tight">
                Trung tâm Thông báo
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 rounded-xl bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
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
              className="text-xs text-muted-foreground hover:text-primary font-semibold cursor-pointer transition-colors"
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
                  className={`block p-3.5 rounded-xl border transition-colors ${
                    !item.isRead
                      ? 'bg-primary/6 border-primary/25 hover:border-primary/45'
                      : 'bg-secondary/40 border-border hover:bg-secondary/70'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                        item.type === 'promo'
                          ? 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-primary/12 text-primary border-primary/20'
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
                        <h4 className="font-semibold text-xs text-foreground truncate">
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {item.time}
                        </span>
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>Xem thêm ưu đãi tích điểm thành viên</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
