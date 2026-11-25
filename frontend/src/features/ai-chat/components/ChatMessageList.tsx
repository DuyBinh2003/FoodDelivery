'use client';

import React, { useEffect, useRef } from 'react';
import { Sparkles, Utensils, ReceiptText, ShieldCheck, Award } from 'lucide-react';
import { ChatMessageItem } from '@/features/ai-chat/components/ChatMessageItem';
import type { ChatMessage } from '@/features/ai-chat/types/chat.types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: Utensils,
    title: 'Gợi ý món trưa ngon',
    query: 'Gợi ý giúp tôi vài món ăn trưa ngon miệng, thanh đạm gần đây.',
  },
  {
    icon: ReceiptText,
    title: 'Đơn hàng gần nhất',
    query: 'Đơn hàng gần nhất của tôi đang ở trạng thái nào rồi?',
  },
  {
    icon: ShieldCheck,
    title: 'Chính sách hoàn tiền',
    query: 'Quy định và thời gian hoàn tiền của FoodDelivery như thế nào?',
  },
  {
    icon: Award,
    title: 'Điểm thưởng FoodPoints',
    query: 'Tôi hiện có bao nhiêu điểm thưởng và cách đổi voucher thế nào?',
  },
];

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-6 text-center">
        {/* Bot Icon */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 p-0.5 shadow-sm mb-3 animate-fade-in">
          <div className="flex h-full w-full items-center justify-center rounded-2xl bg-card border border-primary/20">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
        </div>

        <h3 className="text-base font-semibold text-foreground">
          Xin chào! Tôi là FoodBot
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-[260px] leading-relaxed">
          Trợ lý AI hỗ trợ gợi ý món ăn, kiểm tra đơn hàng và giải đáp chính sách 24/7.
        </p>

        {/* Suggestion Starter Chips */}
        <div className="mt-5 w-full grid grid-cols-1 gap-2 text-left">
          {STARTER_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectPrompt(item.query)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-xs text-foreground transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm cursor-pointer"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
