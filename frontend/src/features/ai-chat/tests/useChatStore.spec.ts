/**
 * @file useChatStore.spec.ts
 * @description Unit tests for AI Chat Zustand store managing drawer state, streaming messages, and feedback
 * @traceability
 *   - Plan: docs/plans/platform/ai-chatbox-rag-gemini.md # Section 10
 *   - Doc: docs/plans/platform/ai-chatbox-rag-gemini.md
 *   - Use Case: AI Chat Frontend Store State Management
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/features/ai-chat/stores/useChatStore';

describe('useChatStore - Zustand State Management Suite', () => {
  beforeEach(() => {
    // Reset store state before every test
    useChatStore.setState({
      isOpen: false,
      isSessionListOpen: false,
      currentSessionId: null,
      messages: [],
      sessions: [],
      isStreaming: false,
      error: null,
    });
  });

  // ==========================================
  // 1. HAPPY PATH (TC-HP-01 -> TC-HP-06)
  // ==========================================
  describe('Happy Path', () => {
    it('TC-HP-01: Correctly updates panel visibility via openChat, closeChat, and toggleChat', () => {
      const store = useChatStore.getState();
      expect(store.isOpen).toBe(false);

      store.openChat();
      expect(useChatStore.getState().isOpen).toBe(true);

      store.closeChat();
      expect(useChatStore.getState().isOpen).toBe(false);

      store.toggleChat();
      expect(useChatStore.getState().isOpen).toBe(true);

      store.toggleChat();
      expect(useChatStore.getState().isOpen).toBe(false);
    });

    it('TC-HP-02: Controls session list drawer visibility via openSessionList and closeSessionList', () => {
      const store = useChatStore.getState();
      expect(store.isSessionListOpen).toBe(false);

      store.openSessionList();
      expect(useChatStore.getState().isSessionListOpen).toBe(true);

      store.closeSessionList();
      expect(useChatStore.getState().isSessionListOpen).toBe(false);
    });

    it('TC-HP-03: Adds user message optimistically, returns tempId, and clears prior error', () => {
      useChatStore.setState({ error: 'Previous network timeout' });
      const store = useChatStore.getState();

      const tempId = store.addUserMessage('Gợi ý món ăn trưa', 'session-123');

      const state = useChatStore.getState();
      expect(tempId).toMatch(/^temp-user-\d+$/);
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toEqual(
        expect.objectContaining({
          id: tempId,
          sessionId: 'session-123',
          role: 'user',
          content: 'Gợi ý món ăn trưa',
        }),
      );
      expect(state.error).toBeNull();
    });

    it('TC-HP-04: Appends streaming chunks sequentially to assistant message placeholder', () => {
      const store = useChatStore.getState();
      store.addUserMessage('Xin chào', 'session-123');
      store.addAssistantMessagePlaceholder('session-123');

      expect(useChatStore.getState().isStreaming).toBe(true);

      store.appendStreamChunk('Chào ');
      store.appendStreamChunk('bạn, ');
      store.appendStreamChunk('tôi có thể giúp gì?');

      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(2);
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe('Chào bạn, tôi có thể giúp gì?');
    });

    it('TC-HP-05: Finalizes assistant message with server ID, intent, tokensUsed, and ends streaming', () => {
      const store = useChatStore.getState();
      store.addAssistantMessagePlaceholder('session-123');
      store.appendStreamChunk('Cơm gà xối mỡ');

      store.finishAssistantMessage({
        id: 'msg-final-999',
        sessionId: 'session-123',
        intent: 'MENU_RECOMMENDATION',
        tokensUsed: 80,
      });

      const state = useChatStore.getState();
      expect(state.isStreaming).toBe(false);
      expect(state.currentSessionId).toBe('session-123');
      expect(state.messages[0]).toEqual(
        expect.objectContaining({
          id: 'msg-final-999',
          sessionId: 'session-123',
          role: 'assistant',
          content: 'Cơm gà xối mỡ',
          intent: 'MENU_RECOMMENDATION',
          tokensUsed: 80,
          isStreaming: false,
        }),
      );
    });

    it('TC-HP-06: Updates message feedback rating and comment accurately', () => {
      useChatStore.setState({
        messages: [
          {
            id: 'msg-target-1',
            sessionId: 'session-1',
            role: 'assistant',
            content: 'Quán ăn ngon gần bạn...',
            createdAt: new Date().toISOString(),
          },
        ],
      });

      useChatStore.getState().updateMessageFeedback('msg-target-1', 1, 'Gợi ý rất chuẩn');

      const state = useChatStore.getState();
      expect(state.messages[0].feedbacks).toEqual([
        { rating: 1, comment: 'Gợi ý rất chuẩn' },
      ]);
    });
  });

  // ==========================================
  // 2. EDGE CASES (TC-EC-01 -> TC-EC-04)
  // ==========================================
  describe('Edge Cases', () => {
    it('TC-EC-01: appendStreamChunk does not throw or mutate when messages array is empty', () => {
      expect(() => {
        useChatStore.getState().appendStreamChunk('chunk on empty');
      }).not.toThrow();

      expect(useChatStore.getState().messages).toEqual([]);
    });

    it('TC-EC-02: finishAssistantMessage safely marks isStreaming=false when no messages exist', () => {
      useChatStore.setState({ isStreaming: true });

      useChatStore.getState().finishAssistantMessage({ id: 'msg-ghost' });

      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it('TC-EC-03: removeSession clears currentSessionId and messages only if active session was removed', () => {
      useChatStore.setState({
        sessions: [
          { id: 'sess-active', userId: 'u1', userRole: 'CUSTOMER', title: 'Phiên 1', isActive: true, createdAt: '', updatedAt: '' },
          { id: 'sess-inactive', userId: 'u1', userRole: 'CUSTOMER', title: 'Phiên 2', isActive: true, createdAt: '', updatedAt: '' },
        ],
        currentSessionId: 'sess-active',
        messages: [
          { id: 'm1', sessionId: 'sess-active', role: 'user', content: 'Hi', createdAt: '' },
        ],
      });

      // Remove inactive session
      useChatStore.getState().removeSession('sess-inactive');
      expect(useChatStore.getState().sessions).toHaveLength(1);
      expect(useChatStore.getState().currentSessionId).toBe('sess-active');
      expect(useChatStore.getState().messages).toHaveLength(1);

      // Remove active session
      useChatStore.getState().removeSession('sess-active');
      expect(useChatStore.getState().sessions).toHaveLength(0);
      expect(useChatStore.getState().currentSessionId).toBeNull();
      expect(useChatStore.getState().messages).toHaveLength(0);
    });

    it('TC-EC-04: Gracefully handles setSessions and setMessages with arbitrary replacement data', () => {
      const store = useChatStore.getState();
      store.setSessions([
        { id: 's1', userId: 'u1', userRole: 'CUSTOMER', title: 'Cuộc gọi 1', isActive: true, createdAt: '', updatedAt: '' },
      ]);
      expect(useChatStore.getState().sessions).toHaveLength(1);

      store.setMessages([]);
      expect(useChatStore.getState().messages).toEqual([]);
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (TC-ER-01 -> TC-ER-03)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('TC-ER-01: setError updates error message and immediately disables streaming state', () => {
      useChatStore.setState({ isStreaming: true });

      useChatStore.getState().setError('Lỗi kết nối đến máy chủ AI');

      const state = useChatStore.getState();
      expect(state.error).toBe('Lỗi kết nối đến máy chủ AI');
      expect(state.isStreaming).toBe(false);
    });

    it('TC-ER-02: resetConversation completely wipes conversation state, messages, and errors', () => {
      useChatStore.setState({
        currentSessionId: 'sess-to-reset',
        messages: [{ id: 'm1', sessionId: 'sess-to-reset', role: 'user', content: 'test', createdAt: '' }],
        error: 'Cũ',
        isStreaming: true,
      });

      useChatStore.getState().resetConversation();

      const state = useChatStore.getState();
      expect(state.currentSessionId).toBeNull();
      expect(state.messages).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.isStreaming).toBe(false);
    });

    it('TC-ER-03: updateMessageFeedback ignores non-existent messageId without altering messages', () => {
      const originalMessage = {
        id: 'msg-exist',
        sessionId: 'sess-1',
        role: 'assistant' as const,
        content: 'Original',
        createdAt: '',
      };
      useChatStore.setState({ messages: [originalMessage] });

      useChatStore.getState().updateMessageFeedback('msg-not-found', -1, 'Spam');

      const state = useChatStore.getState();
      expect(state.messages[0]).toEqual(originalMessage);
    });
  });
});
