'use client';

import React from 'react';
import { Sparkles, History, Plus, X } from 'lucide-react';
import { useChatStore } from '@/features/ai-chat/stores/useChatStore';
import { useChatStream } from '@/features/ai-chat/hooks/useChatStream';
import { ChatMessageList } from '@/features/ai-chat/components/ChatMessageList';
import { ChatInput } from '@/features/ai-chat/components/ChatInput';
import { SessionListModal } from '@/features/ai-chat/components/SessionListModal';
import type { UserLocation } from '@/features/ai-chat/types/chat.types';

export const ChatPanel: React.FC = () => {
  const {
    isOpen,
    closeChat,
    openSessionList,
    messages,
    resetConversation,
  } = useChatStore();

  const { sendMessage, cancelStream, isStreaming } = useChatStream();

  if (!isOpen) return null;

  const handleSendMessage = (text: string, location?: UserLocation) => {
    sendMessage(text, location);
  };

  const handleSelectPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div
      aria-label="Khung trò chuyện với FoodBot AI"
      className="fixed bottom-4 right-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/60 w-[calc(100vw-32px)] sm:w-[390px] h-[580px] max-h-[85vh] animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 shadow-md shadow-orange-500/20">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-zinc-100">FoodBot AI</h3>
              <span className="rounded bg-orange-500/10 px-1.5 py-0.2 text-[10px] font-medium text-orange-400 border border-orange-500/20">
                CRAG
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Trợ lý hỗ trợ 24/7</p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={openSessionList}
            title="Lịch sử hội thoại"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <History className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={resetConversation}
            title="Cuộc trò chuyện mới"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={closeChat}
            title="Đóng chatbox"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Message List Area */}
      <div className="relative flex-1 overflow-hidden bg-zinc-950">
        <ChatMessageList
          messages={messages}
          onSelectPrompt={handleSelectPrompt}
        />
        <SessionListModal />
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onCancelStream={cancelStream}
        isStreaming={isStreaming}
      />
    </div>
  );
};
