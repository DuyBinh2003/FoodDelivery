'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  X,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  Flame,
} from 'lucide-react';
import { sendAiChatMessage } from '../api/ai-assistant-api';
import { AiDishCard } from './ai-dish-card';
import type { ChatMessage } from '../types/ai.types';

const QUICK_PROMPTS = [
  'Hôm nay ốm, muốn ăn món gì ấm bụng?',
  'Cơm trưa văn phòng no nê dưới 45k',
  'Thèm đồ ngọt & trà sữa quanh đây',
  'Món chay thanh đạm, ít dầu mỡ',
];

let globalMessageCounter = 0;
function createMessageId(prefix: string) {
  globalMessageCounter += 1;
  return `${prefix}-${globalMessageCounter}`;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  content:
    'Chào bạn! Hôm nay bạn cảm thấy thế nào hoặc muốn thưởng thức hương vị gì? Hãy chia sẻ tâm trạng, ngân sách hoặc sở thích ẩm thực để mình gợi ý món ngon chuẩn vị nhất nhé! 🍜',
  timestamp: 0,
};

export function AiAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: createMessageId('msg-user'),
      role: 'user',
      content: text,
      timestamp: 0,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Chuẩn bị lịch sử trò chuyện ngắn gọn cho context
      const history = messages
        .filter((m) => m.id !== 'msg-welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const response = await sendAiChatMessage({
        message: text,
        sessionId,
        history,
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      const botMessage: ChatMessage = {
        id: createMessageId('msg-ai'),
        role: 'assistant',
        content: response.reply,
        suggestedDishes: response.suggestedDishes,
        source: response.source,
        timestamp: 0,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: createMessageId('msg-err'),
        role: 'assistant',
        content:
          'Xin lỗi bạn, kết nối tới máy chủ AI đang tạm thời gián đoạn. Bạn thử lại câu hỏi khác nhé!',
        timestamp: 0,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setSessionId(undefined);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-slate-950 font-bold rounded-full shadow-2xl shadow-emerald-500/25 hover:shadow-emerald-500/40 border border-emerald-400/30 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Mở Trợ lý AI gợi ý món ăn"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            <Sparkles className="w-3 h-3 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <span className="text-xs tracking-wide uppercase font-extrabold text-slate-950">
            Hỏi AI Món Ngon
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-950" />
          </span>
        </button>
      )}

      {/* Chat Window Dialog */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-slate-950/95 border border-slate-800 backdrop-blur-2xl shadow-2xl overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-12 rounded-3xl'
              : 'bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[85vh] rounded-3xl'
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950 font-black">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">Trợ Lý Ẩm Thực AI</h3>
                  <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Gợi ý món ăn thông minh & cá nhân hóa</p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Làm mới cuộc trò chuyện"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer hidden sm:block"
                title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3.5 py-2 bg-slate-900/40 border-b border-slate-800/40 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-500 flex items-center gap-1 whitespace-nowrap pl-0.5">
              <Flame className="w-3 h-3 text-amber-500" /> Gợi ý:
            </span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700/60 hover:border-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } space-y-2`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-medium rounded-br-none shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/90 text-slate-200 border border-slate-800/90 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {msg.source && (
                    <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center gap-1 text-[10px] text-slate-500">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                      <span>
                        {msg.source === 'LLM_POWERED'
                          ? 'Gợi ý bởi Gemini AI'
                          : 'Đề xuất từ Catalog món ngon'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Suggested Dishes Grid */}
                {msg.suggestedDishes && msg.suggestedDishes.length > 0 && (
                  <div className="w-full grid grid-cols-1 gap-2 pt-1">
                    {msg.suggestedDishes.map((dish) => (
                      <AiDishCard key={dish.dishId} dish={dish} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs bg-slate-900/60 border border-slate-800/60 w-fit px-3.5 py-2 rounded-2xl rounded-bl-none">
                <Bot className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span className="text-[11px]">Trợ lý AI đang tìm món ngon...</span>
                <span className="flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span
                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
                    style={{ animationDelay: '200ms' }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
                    style={{ animationDelay: '400ms' }}
                  />
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Bạn muốn ăn món gì hôm nay? (VD: cháo nóng, cơm trưa < 50k)..."
              disabled={isLoading}
              className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-500/20"
              aria-label="Gửi tin nhắn"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
