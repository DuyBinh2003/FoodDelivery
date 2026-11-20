'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  CheckCheck,
  Check,
  Sparkles,
  Bike,
  User as UserIcon,
  Minimize2,
} from 'lucide-react';
import { useOrderChat } from '@/features/orders/hooks/useOrderChat';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface OrderLiveChatWidgetProps {
  orderId: string;
  driverName?: string;
  restaurantName?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'RESTAURANT';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OrderLiveChatWidget({
  orderId,
  driverName = 'Tài xế công nghệ',
  restaurantName = 'Nhà hàng',
  role = 'CUSTOMER',
  isOpen: externalIsOpen,
  onOpenChange,
}: OrderLiveChatWidgetProps) {
  const { user } = useAuthStore();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isConnected,
    unreadCount,
    quickReplies,
    sendMessage,
    markAsSeen,
  } = useOrderChat({ orderId, role, enabled: true });

  const currentUserId = user?.id;

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      markAsSeen();
    }
  }, [messages, isOpen, markAsSeen]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim(), 'TEXT');
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text, 'QUICK_REPLY');
  };

  const targetTitle = role === 'DRIVER' ? 'Khách hàng' : driverName;
  const targetSub = role === 'DRIVER' ? restaurantName : 'Tài xế giao đơn hàng';

  return (
    <>
      {/* 1. Floating Action Button (FAB) at bottom-right */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold px-4 py-3.5 rounded-full shadow-2xl shadow-orange-500/40 border border-white/20 transition-all hover:scale-105 active:scale-95 animate-in fade-in"
          aria-label="Mở khung trò chuyện"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center border-2 border-zinc-950 animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide pr-1">
            Nhắn tin ({targetTitle})
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* 2. Interactive Chat Window Box */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[85vh] flex flex-col bg-zinc-900/95 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-zinc-800/80 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold">
                  {role === 'DRIVER' ? <UserIcon className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                  }`}
                  title={isConnected ? 'Đang trực tuyến' : 'Đang kết nối lại'}
                />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  {targetTitle}
                  <span className="text-[10px] bg-white/10 text-zinc-300 font-normal px-1.5 py-0.5 rounded">
                    {role === 'DRIVER' ? 'Đơn hàng' : 'Tài xế'}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 truncate max-w-[170px]">{targetSub}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Thu nhỏ"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors"
                title="Đóng cửa sổ chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-700">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-zinc-400">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 mb-3">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-200">Kênh chat trực tiếp</h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Trò chuyện thời gian thực với tài xế và quán ăn để cập nhật vị trí, lưu ý đơn hàng.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId || msg.sender_role === role;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    {!isMe && (
                      <span className="text-[10px] text-zinc-400 px-1 font-medium">
                        {msg.sender_name} • {msg.sender_role === 'DRIVER' ? 'Tài xế' : msg.sender_role}
                      </span>
                    )}

                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-tr-xs shadow-orange-500/10'
                          : 'bg-zinc-800 text-zinc-200 rounded-tl-xs border border-white/5'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content || msg.message}</p>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 px-1">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {isMe && (
                        <span>
                          {msg.is_read || msg.is_seen ? (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-400 inline" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-zinc-400 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies Carousel */}
          {quickReplies.length > 0 && (
            <div className="px-3 py-2 bg-zinc-950/60 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-0.5 flex-shrink-0 px-1">
                <Sparkles className="w-3 h-3 text-orange-400" /> Nhanh:
              </span>
              {quickReplies.map((qr) => (
                <button
                  key={qr.id}
                  type="button"
                  onClick={() => handleQuickReply(qr.text)}
                  className="whitespace-nowrap text-xs bg-zinc-800 hover:bg-orange-500/20 text-zinc-300 hover:text-orange-300 border border-white/10 hover:border-orange-500/30 px-3 py-1.5 rounded-full transition-all active:scale-95"
                >
                  {qr.text}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-zinc-900 border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={role === 'DRIVER' ? 'Nhắn tin cho khách hàng...' : 'Nhắn tin cho tài xế...'}
              className="flex-1 bg-zinc-800/80 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-all shadow-md shadow-orange-500/20 active:scale-95 flex-shrink-0"
              title="Gửi tin nhắn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
