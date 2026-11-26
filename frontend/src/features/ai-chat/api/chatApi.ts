import { apiClient, getClientAuthToken } from '@/lib/api-client';
import { resolveServiceUrl } from '@/lib/api-url';
import { getRequiredEnv } from '@/lib/env';
import type {
  ChatMessage,
  SessionListResponse,
  ChatRequestPayload,
} from '@/features/ai-chat/types/chat.types';

export const chatApi = {
  getSessions: async (page: number = 1, limit: number = 20): Promise<SessionListResponse> => {
    return apiClient<SessionListResponse>('/ai/sessions', {
      method: 'GET',
      params: { page: String(page), limit: String(limit) },
    });
  },

  getSessionMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    return apiClient<ChatMessage[]>(`/ai/sessions/${sessionId}/messages`, {
      method: 'GET',
    });
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    return apiClient<void>(`/ai/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  sendFeedback: async (
    messageId: string,
    rating: number,
    comment?: string,
  ): Promise<void> => {
    return apiClient<void>(`/ai/messages/${messageId}/feedback`, {
      method: 'POST',
      body: { rating, comment },
    });
  },

  streamChat: async (
    payload: ChatRequestPayload,
    onSessionInit: (sessionId: string) => void,
    onChunk: (chunk: string) => void,
    onDone: (data: { sessionId: string; messageId: string; intent?: string; tokensUsed?: number }) => void,
    onError: (errMessage: string) => void,
    signal?: AbortSignal,
    onStatus?: (status: { step: string; message?: string }) => void,
  ): Promise<void> => {
    // Route through API Gateway when configured; otherwise fail-fast on AI service URL
    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL?.trim();
    const endpointUrl = gatewayUrl
      ? (() => {
          const resolved = resolveServiceUrl('/ai/chat');
          return `${resolved.baseUrl}${resolved.path}`;
        })()
      : `${getRequiredEnv('NEXT_PUBLIC_AI_SERVICE_URL').replace(/\/$/, '')}/ai/chat`;

    // Get auth token via standardized helper
    const token = getClientAuthToken();

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let errMsg = 'Không thể kết nối đến máy chủ AI';
      try {
        const errorJson = (await response.json()) as { message?: string };
        if (errorJson.message) errMsg = errorJson.message;
      } catch {
        // use fallback message
      }
      throw new Error(errMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Trình duyệt không hỗ trợ đọc dữ liệu stream');
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.replace(/^data:\s*/, '');
          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr) as {
              type: string;
              sessionId?: string;
              messageId?: string;
              content?: string;
              step?: string;
              intent?: string;
              tokensUsed?: number;
              message?: string;
            };

            if (parsed.type === 'session_init' && parsed.sessionId) {
              onSessionInit(parsed.sessionId);
            } else if (parsed.type === 'status' && parsed.step) {
              onStatus?.({ step: parsed.step, message: parsed.message });
            } else if (parsed.type === 'chunk' && parsed.content) {
              onChunk(parsed.content);
            } else if (parsed.type === 'done') {
              onDone({
                sessionId: parsed.sessionId || '',
                messageId: parsed.messageId || '',
                intent: parsed.intent,
                tokensUsed: parsed.tokensUsed,
              });
            } else if (parsed.type === 'error') {
              onError(parsed.message || 'Lỗi khi nhận phản hồi từ AI');
            }
          } catch {
            // ignore corrupted chunk line
          }
        }
      }
    } finally {
      // Release stream reader lock to avoid resource leak
      reader.releaseLock();
    }
  },
};
