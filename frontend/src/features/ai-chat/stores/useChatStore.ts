import { create } from 'zustand';
import type { ChatMessage, ChatSession } from '@/features/ai-chat/types/chat.types';

interface ChatState {
  isOpen: boolean;
  isSessionListOpen: boolean;
  currentSessionId: string | null;
  messages: ChatMessage[];
  sessions: ChatSession[];
  isStreaming: boolean;
  error: string | null;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  openSessionList: () => void;
  closeSessionList: () => void;
  setCurrentSessionId: (sessionId: string | null) => void;
  setSessions: (sessions: ChatSession[]) => void;
  removeSession: (sessionId: string) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addUserMessage: (content: string, sessionId?: string) => string;
  addAssistantMessagePlaceholder: (sessionId: string) => void;
  appendStreamChunk: (chunk: string) => void;
  finishAssistantMessage: (data: {
    id: string;
    sessionId?: string;
    intent?: string;
    tokensUsed?: number;
  }) => void;
  updateMessageFeedback: (messageId: string, rating: number, comment?: string) => void;
  setError: (error: string | null) => void;
  resetConversation: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  isSessionListOpen: false,
  currentSessionId: null,
  messages: [],
  sessions: [],
  isStreaming: false,
  error: null,

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

  openSessionList: () => set({ isSessionListOpen: true }),
  closeSessionList: () => set({ isSessionListOpen: false }),

  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
  setSessions: (sessions) => set({ sessions }),
  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
      messages: state.currentSessionId === sessionId ? [] : state.messages,
    })),

  setMessages: (messages) => set({ messages }),

  addUserMessage: (content, sessionId) => {
    const tempId = `temp-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tempId,
      sessionId: sessionId || '',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, userMsg],
      error: null,
    }));
    return tempId;
  },

  addAssistantMessagePlaceholder: (sessionId) => {
    const placeholder: ChatMessage = {
      id: `temp-bot-${Date.now()}`,
      sessionId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, placeholder],
      isStreaming: true,
      error: null,
    }));
  },

  appendStreamChunk: (chunk) => {
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length === 0) return state;

      const lastIdx = msgs.length - 1;
      const lastMsg = msgs[lastIdx];
      if (lastMsg.role === 'assistant') {
        msgs[lastIdx] = {
          ...lastMsg,
          content: lastMsg.content + chunk,
        };
      }
      return { messages: msgs };
    });
  },

  finishAssistantMessage: (data) => {
    set((state) => {
      const msgs = [...state.messages];
      if (msgs.length === 0) return { ...state, isStreaming: false };

      const lastIdx = msgs.length - 1;
      const lastMsg = msgs[lastIdx];
      if (lastMsg.role === 'assistant') {
        msgs[lastIdx] = {
          ...lastMsg,
          id: data.id || lastMsg.id,
          sessionId: data.sessionId || lastMsg.sessionId,
          intent: data.intent,
          tokensUsed: data.tokensUsed,
          isStreaming: false,
        };
      }
      return {
        messages: msgs,
        isStreaming: false,
        currentSessionId: data.sessionId || state.currentSessionId,
      };
    });
  },

  updateMessageFeedback: (messageId, rating, comment) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId
          ? {
              ...m,
              feedbacks: [{ rating, comment: comment ?? null }],
            }
          : m
      ),
    }));
  },

  setError: (error) => set({ error, isStreaming: false }),

  resetConversation: () =>
    set({
      currentSessionId: null,
      messages: [],
      error: null,
      isStreaming: false,
    }),
}));
