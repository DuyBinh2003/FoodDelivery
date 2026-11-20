'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Check,
} from 'lucide-react';
import Link from 'next/link';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'ORDER_EVENT' | 'AI_RECOMMEND' | 'ALERT';
  timestamp: string;
  read: boolean;
  link?: string;
}

const SAMPLE_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Đơn hàng đã được xác nhận',
    message: 'Nhà hàng Cơm Tấm Ba Ghiền đã tiếp nhận đơn hàng của bạn qua n8n webhook workflow.',
    type: 'ORDER_EVENT',
    timestamp: '5 phút trước',
    read: false,
    link: '/history',
  },
  {
    id: 'notif-2',
    title: 'Gợi ý món ngon từ Trợ lý AI',
    message: 'Trưa nay trời ấm, Trợ lý AI gợi ý bạn thử món "Bún Bò Huế Đặc Biệt" đang có ưu đãi.',
    type: 'AI_RECOMMEND',
    timestamp: '30 phút trước',
    read: false,
    link: '/menu',
  },
  {
    id: 'notif-3',
    title: 'Tài xế đang di chuyển đến quán',
    message: 'Tài xế Nguyễn Văn A đang trên đường đến lấy món. Ước tính giao trong 20 phút.',
    type: 'ORDER_EVENT',
    timestamp: '1 giờ trước',
    read: true,
    link: '/history',
  },
];

export function NotificationCenterPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>(SAMPLE_NOTIFICATIONS);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
        aria-label="Xem thông báo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md shadow-rose-500/40 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-950/95 border border-slate-800 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">Thông báo tự động</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-rose-500/15 text-rose-400 font-semibold px-2 py-0.5 rounded-full border border-rose-500/30">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* List Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Bạn chưa có thông báo mới nào
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                    n.read
                      ? 'bg-transparent hover:bg-slate-900/40 text-slate-400'
                      : 'bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08] text-slate-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'AI_RECOMMEND' ? (
                      <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4
                        className={`text-xs font-semibold truncate ${
                          n.read ? 'text-slate-300' : 'text-slate-100 font-bold'
                        }`}
                      >
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {n.timestamp}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => setIsOpen(false)}
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 mt-1.5 font-medium"
                      >
                        <span>Chi tiết</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    )}
                  </div>

                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-900/60 border-t border-slate-800/80 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Tự động đồng bộ qua n8n Webhook & Notification Engine</span>
          </div>
        </div>
      )}
    </div>
  );
}
