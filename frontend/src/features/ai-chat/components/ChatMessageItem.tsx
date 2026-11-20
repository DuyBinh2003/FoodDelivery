'use client';

import React, { useState } from 'react';
import { User, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi } from '@/features/ai-chat/api/chatApi';
import { useChatStore } from '@/features/ai-chat/stores/useChatStore';
import type { ChatMessage } from '@/features/ai-chat/types/chat.types';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const INTENT_LABELS: Record<string, string> = {
  MENU_RECOMMENDATION: 'Gợi ý món ăn',
  ORDER_STATUS: 'Tra cứu đơn hàng',
  REFUND_POLICY: 'Chính sách hoàn tiền',
  RESTAURANT_SEARCH: 'Tìm nhà hàng',
  LOYALTY_PROGRAM: 'Điểm thưởng',
  DELIVERY_SUPPORT: 'Hỗ trợ tài xế',
  PARTNER_SUPPORT: 'Hỗ trợ quán ăn',
  GENERAL_CHITCHAT: 'Trò chuyện',
  OUT_OF_SCOPE: 'Thông tin chung',
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isBot = message.role === 'assistant';
  const { updateMessageFeedback } = useChatStore();
  const [submittingRating, setSubmittingRating] = useState<number | null>(null);

  const existingFeedback = message.feedbacks?.[0];
  const userRating = existingFeedback?.rating;

  const handleFeedback = async (rating: number) => {
    if (userRating === rating || !message.id || message.isStreaming) return;
    setSubmittingRating(rating);
    try {
      await chatApi.sendFeedback(message.id, rating);
      updateMessageFeedback(message.id, rating);
      toast.success(
        rating === 1 ? 'Cảm ơn bạn đã đánh giá hữu ích!' : 'Cảm ơn phản hồi, chúng tôi sẽ cải thiện tốt hơn.',
      );
    } catch {
      toast.error('Không thể gửi đánh giá, vui lòng thử lại.');
    } finally {
      setSubmittingRating(null);
    }
  };

  return (
    <div className={`flex gap-3 text-sm ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-medium shadow-md ${
          isBot
            ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/20'
            : 'bg-zinc-800 text-zinc-300 border border-white/10'
        }`}
      >
        {isBot ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>

      {/* Bubble Content */}
      <div className={`flex max-w-[82%] flex-col ${isBot ? 'items-start' : 'items-end'}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap break-words ${
            isBot
              ? 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-sm'
              : 'bg-orange-600 text-white rounded-br-none shadow-md shadow-orange-600/10'
          }`}
        >
          {message.content ? (
            message.content
          ) : message.isStreaming ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-orange-400 animate-bounce" />
            </div>
          ) : (
            <span className="text-zinc-400 italic">Nội dung trống</span>
          )}
        </div>

        {/* Bot Metadata & Feedback Bar */}
        {isBot && !message.isStreaming && message.content && (
          <div className="mt-1.5 flex items-center gap-2 px-1 text-xs text-zinc-400">
            {message.intent && INTENT_LABELS[message.intent] && (
              <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-orange-400 border border-zinc-700/50">
                {INTENT_LABELS[message.intent]}
              </span>
            )}

            {/* Like / Dislike */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                onClick={() => handleFeedback(1)}
                disabled={submittingRating !== null}
                className={`p-1 rounded-md transition-colors hover:bg-zinc-800 ${
                  userRating === 1 ? 'text-orange-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Hữu ích"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleFeedback(-1)}
                disabled={submittingRating !== null}
                className={`p-1 rounded-md transition-colors hover:bg-zinc-800 ${
                  userRating === -1 ? 'text-red-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Chưa tốt"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
