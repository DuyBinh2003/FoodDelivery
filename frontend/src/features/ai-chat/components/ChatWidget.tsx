'use client';

import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useChatStore } from '@/features/ai-chat/stores/useChatStore';
import { ChatPanel } from '@/features/ai-chat/components/ChatPanel';

export const ChatWidget: React.FC = () => {
  const { isOpen, toggleChat } = useChatStore();

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={toggleChat}
          aria-label="Mở trợ lý ảo FoodBot AI"
          className="fixed bottom-6 right-6 z-40 group flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/30 transition-all duration-300 hover:scale-105 hover:shadow-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-zinc-950 active:scale-95"
        >
          {/* Subtle pulse background ring */}
          <span className="absolute -inset-1 rounded-2xl bg-orange-500 opacity-20 blur-sm group-hover:opacity-40 transition-opacity animate-pulse" />

          <div className="relative flex items-center justify-center">
            <MessageSquare className="h-6 w-6 transition-transform group-hover:scale-110" />
            <Sparkles className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-200 animate-spin [animation-duration:6s]" />
          </div>
        </button>
      )}

      {/* Slide-in Chat Panel */}
      <ChatPanel />
    </>
  );
};
