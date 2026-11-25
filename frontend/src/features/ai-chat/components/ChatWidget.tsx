'use client';

import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useChatStore } from '@/features/ai-chat/stores/useChatStore';
import { ChatPanel } from '@/features/ai-chat/components/ChatPanel';

export const ChatWidget: React.FC = () => {
  const { isOpen, toggleChat } = useChatStore();

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={toggleChat}
          aria-label="Mở trợ lý ảo FoodBot AI"
          className="fixed bottom-20 md:bottom-6 right-5 md:right-6 z-40 group flex h-13 w-13 md:h-14 md:w-14 items-center justify-center rounded-2xl bg-primary hover:bg-primary-dark text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-95 cursor-pointer"
        >
          <span className="absolute -inset-1 rounded-2xl bg-primary opacity-15 blur-sm group-hover:opacity-30 transition-opacity animate-pulse" />

          <div className="relative flex items-center justify-center">
            <MessageSquare className="h-6 w-6 transition-transform group-hover:scale-110" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-300" />
          </div>
        </button>
      )}

      <ChatPanel />
    </>
  );
};
