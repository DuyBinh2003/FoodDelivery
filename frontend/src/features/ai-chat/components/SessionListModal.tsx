'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi } from '@/features/ai-chat/api/chatApi';
import { useChatStore } from '@/features/ai-chat/stores/useChatStore';
import type { ChatSession } from '@/features/ai-chat/types/chat.types';

export const SessionListModal: React.FC = () => {
  const {
    isSessionListOpen,
    closeSessionList,
    currentSessionId,
    setCurrentSessionId,
    setMessages,
    sessions,
    setSessions,
    removeSession,
    resetConversation,
  } = useChatStore();

  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionListOpen) return;

    let isMounted = true;
    const fetchSessions = async () => {
      setIsLoading(true);
      try {
        const resp = await chatApi.getSessions(1, 30);
        if (isMounted) setSessions(resp.data);
      } catch {
        toast.error('Không thể tải lịch sử trò chuyện');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSessions();
    return () => {
      isMounted = false;
    };
  }, [isSessionListOpen, setSessions]);

  if (!isSessionListOpen) return null;

  const handleSelectSession = async (session: ChatSession) => {
    if (session.id === currentSessionId) {
      closeSessionList();
      return;
    }

    try {
      const msgs = await chatApi.getSessionMessages(session.id);
      setCurrentSessionId(session.id);
      setMessages(msgs);
      closeSessionList();
    } catch {
      toast.error('Không thể tải nội dung cuộc trò chuyện này');
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await chatApi.deleteSession(sessionId);
      removeSession(sessionId);
      toast.success('Đã xóa phiên trò chuyện');
    } catch {
      toast.error('Không thể xóa cuộc trò chuyện');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStartNewChat = () => {
    resetConversation();
    closeSessionList();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-zinc-950/95 backdrop-blur-md animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-orange-400" />
          Lịch sử trò chuyện
        </h4>
        <button
          type="button"
          onClick={closeSessionList}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* New chat action */}
      <div className="p-3 border-b border-zinc-900">
        <button
          type="button"
          onClick={handleStartNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600/10 border border-orange-500/20 py-2 text-xs font-medium text-orange-400 hover:bg-orange-600/20 transition-all"
        >
          <Plus className="h-4 w-4" />
          Bắt đầu cuộc trò chuyện mới
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-zinc-500">Đang tải lịch sử...</div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            Chưa có cuộc trò chuyện nào trước đây
          </div>
        ) : (
          sessions.map((sess) => {
            const isSelected = sess.id === currentSessionId;
            return (
              <div
                key={sess.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectSession(sess)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectSession(sess);
                  }
                }}
                className={`group flex items-center justify-between gap-2 rounded-xl p-2.5 text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-white border border-zinc-700/60'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <div className="truncate flex-1">
                  <div className="font-medium truncate">{sess.title || 'Cuộc trò chuyện mới'}</div>
                  <div className="text-[10px] text-zinc-500">
                    {new Date(sess.updatedAt).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteSession(e, sess.id)}
                  disabled={deletingId === sess.id}
                  className="p-1 rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Xóa cuộc trò chuyện"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
