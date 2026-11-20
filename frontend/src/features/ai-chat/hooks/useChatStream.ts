import { useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useChatStore } from '@/features/ai-chat/stores/useChatStore';
import { chatApi } from '@/features/ai-chat/api/chatApi';
import type { UserLocation } from '@/features/ai-chat/types/chat.types';

export function useChatStream() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    currentSessionId,
    isStreaming,
    setCurrentSessionId,
    addUserMessage,
    addAssistantMessagePlaceholder,
    appendStreamChunk,
    finishAssistantMessage,
    setError,
  } = useChatStore();

  const sendMessage = useCallback(
    async (messageText: string, userLocation?: UserLocation) => {
      const trimmed = messageText.trim();
      if (!trimmed || isStreaming) return;

      // Abort any ongoing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // 1. Add user message
      addUserMessage(trimmed, currentSessionId ?? undefined);

      // 2. Add assistant placeholder
      addAssistantMessagePlaceholder(currentSessionId || '');

      let assignedSessionId = currentSessionId;

      try {
        await chatApi.streamChat(
          {
            message: trimmed,
            sessionId: currentSessionId ?? undefined,
            userLocation,
          },
          (initSessionId) => {
            assignedSessionId = initSessionId;
            setCurrentSessionId(initSessionId);
          },
          (chunk) => {
            appendStreamChunk(chunk);
          },
          (doneData) => {
            finishAssistantMessage({
              id: doneData.messageId,
              sessionId: doneData.sessionId || assignedSessionId || undefined,
              intent: doneData.intent,
              tokensUsed: doneData.tokensUsed,
            });
          },
          (errorMessage) => {
            setError(errorMessage);
            toast.error(errorMessage);
          },
          abortControllerRef.current.signal,
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const msg = err instanceof Error ? err.message : 'Lỗi kết nối tới trợ lý AI';
        setError(msg);
        toast.error(msg);
        finishAssistantMessage({
          id: `error-${Date.now()}`,
          sessionId: assignedSessionId ?? undefined,
        });
      }
    },
    [
      currentSessionId,
      isStreaming,
      addUserMessage,
      addAssistantMessagePlaceholder,
      appendStreamChunk,
      finishAssistantMessage,
      setCurrentSessionId,
      setError,
    ],
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    sendMessage,
    cancelStream,
    isStreaming,
  };
}
