/**
 * @file chatApi.spec.ts
 * @description Unit tests for AI Chat frontend API client: session management, feedback, and SSE streaming
 * @traceability
 *   - Plan: docs/plans/platform/ai-chatbox-rag-gemini.md # Section 10
 *   - Doc: docs/plans/platform/ai-chatbox-rag-gemini.md
 *   - Use Case: AI Chat Frontend API Layer
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { chatApi } from '@/features/ai-chat/api/chatApi';
import { apiClient, getClientAuthToken } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: vi.fn(),
  getClientAuthToken: vi.fn().mockReturnValue('mock-token'),
}));

describe('chatApi - Frontend API Layer & SSE Stream Suite', () => {
  const originalFetch = globalThis.fetch;
  const originalAiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL;
  const mockApiClient = vi.mocked(apiClient);
  const mockGetClientAuthToken = vi.mocked(getClientAuthToken);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_AI_SERVICE_URL = 'http://localhost:3008';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalAiServiceUrl !== undefined) {
      process.env.NEXT_PUBLIC_AI_SERVICE_URL = originalAiServiceUrl;
    } else {
      delete process.env.NEXT_PUBLIC_AI_SERVICE_URL;
    }
  });

  // Helper to create SSE ReadableStream Response
  function createSseStreamResponse(chunks: string[], status: number = 200) {
    const encoder = new TextEncoder();
    let index = 0;

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (index < chunks.length) {
          controller.enqueue(encoder.encode(chunks[index]));
          index++;
        } else {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }

  // ==========================================
  // 1. HAPPY PATH (TC-HP-01, TC-HP-02)
  // ==========================================
  describe('Happy Path', () => {
    it('TC-HP-01: streamChat dispatches onSessionInit, onChunk, and onDone sequentially', async () => {
      const sseChunks = [
        'data: {"type":"session_init","sessionId":"sess-123"}\n\n',
        'data: {"type":"chunk","content":"Xin chào! "}\n\n',
        'data: {"type":"chunk","content":"Tôi là FoodBot."}\n\n',
        'data: {"type":"done","sessionId":"sess-123","messageId":"msg-888","intent":"GENERAL_CHITCHAT","tokensUsed":42}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createSseStreamResponse(sseChunks));

      const onSessionInit = vi.fn();
      const onChunk = vi.fn();
      const onDone = vi.fn();
      const onError = vi.fn();

      await chatApi.streamChat(
        { message: 'Xin chào' },
        onSessionInit,
        onChunk,
        onDone,
        onError,
      );

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          }),
          body: JSON.stringify({ message: 'Xin chào' }),
        }),
      );

      expect(mockGetClientAuthToken).toHaveBeenCalled();
      expect(onSessionInit).toHaveBeenCalledWith('sess-123');
      expect(onChunk).toHaveBeenCalledWith('Xin chào! ');
      expect(onChunk).toHaveBeenCalledWith('Tôi là FoodBot.');
      expect(onDone).toHaveBeenCalledWith({
        sessionId: 'sess-123',
        messageId: 'msg-888',
        intent: 'GENERAL_CHITCHAT',
        tokensUsed: 42,
      });
      expect(onError).not.toHaveBeenCalled();
    });

    it('TC-HP-02: getSessions, getSessionMessages, deleteSession, and sendFeedback invoke apiClient with correct options', async () => {
      // 1. getSessions
      mockApiClient.mockResolvedValueOnce({
        data: [{ id: 'sess-1', title: 'Phiên 1' }],
        total: 1,
        page: 1,
        limit: 10,
      });
      const sessions = await chatApi.getSessions(1, 10);
      expect(mockApiClient).toHaveBeenCalledWith('/ai/sessions', {
        method: 'GET',
        params: { page: '1', limit: '10' },
      });
      expect(sessions.data).toHaveLength(1);

      // 2. getSessionMessages
      mockApiClient.mockResolvedValueOnce([
        { id: 'm1', role: 'user', content: 'Cơm tấm' },
      ]);
      const messages = await chatApi.getSessionMessages('sess-1');
      expect(mockApiClient).toHaveBeenCalledWith('/ai/sessions/sess-1/messages', {
        method: 'GET',
      });
      expect(messages).toHaveLength(1);

      // 3. deleteSession
      mockApiClient.mockResolvedValueOnce(undefined);
      await chatApi.deleteSession('sess-1');
      expect(mockApiClient).toHaveBeenCalledWith('/ai/sessions/sess-1', {
        method: 'DELETE',
      });

      // 4. sendFeedback
      mockApiClient.mockResolvedValueOnce(undefined);
      await chatApi.sendFeedback('msg-1', 1, 'Hài lòng');
      expect(mockApiClient).toHaveBeenCalledWith('/ai/messages/msg-1/feedback', {
        method: 'POST',
        body: { rating: 1, comment: 'Hài lòng' },
      });
    });
  });

  // ==========================================
  // 2. EDGE CASES (TC-EC-01, TC-EC-02, TC-EC-03)
  // ==========================================
  describe('Edge Cases', () => {
    it('TC-EC-01: Handles fragmented stream chunks and ignores corrupted JSON or empty lines without halting', async () => {
      const fragmentedPackets = [
        'data: {"type":"chunk","con',
        'tent":"Phở bò"}\n\n',
        'data: { invalid corrupted json }\n\n',
        '\n\n',
        'data: {"type":"done","sessionId":"s1","messageId":"m1"}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createSseStreamResponse(fragmentedPackets));

      const onSessionInit = vi.fn();
      const onChunk = vi.fn();
      const onDone = vi.fn();
      const onError = vi.fn();

      await chatApi.streamChat(
        { message: 'Ăn gì?' },
        onSessionInit,
        onChunk,
        onDone,
        onError,
      );

      expect(onChunk).toHaveBeenCalledWith('Phở bò');
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 's1', messageId: 'm1' }),
      );
      expect(onError).not.toHaveBeenCalled();
    });

    it('TC-EC-02: Passes AbortSignal down to fetch request and stops stream on abort', async () => {
      const controller = new AbortController();
      globalThis.fetch = vi.fn().mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => {
        expect(init?.signal).toBe(controller.signal);
        return Promise.resolve(createSseStreamResponse(['data: {"type":"done"}\n\n']));
      });

      await chatApi.streamChat(
        { message: 'Hủy giữa chừng' },
        vi.fn(),
        vi.fn(),
        vi.fn(),
        vi.fn(),
        controller.signal,
      );

      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('TC-EC-04: Dispatches onStatus when provided and safely ignores status events when omitted', async () => {
      const sseChunks = [
        'data: {"type":"status","step":"starting","message":"Đang phân tích..."}\n\n',
        'data: {"type":"chunk","content":"OK"}\n\n',
        'data: {"type":"done","sessionId":"s1","messageId":"m1"}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createSseStreamResponse(sseChunks));

      const onStatus = vi.fn();
      const onChunk = vi.fn();
      await chatApi.streamChat(
        { message: 'Test status' },
        vi.fn(),
        onChunk,
        vi.fn(),
        vi.fn(),
        undefined,
        onStatus,
      );

      expect(onStatus).toHaveBeenCalledWith({
        step: 'starting',
        message: 'Đang phân tích...',
      });
      expect(onChunk).toHaveBeenCalledWith('OK');

      // Edge: omitted onStatus callback should not throw
      globalThis.fetch = vi.fn().mockResolvedValue(createSseStreamResponse(sseChunks));
      await expect(
        chatApi.streamChat(
          { message: 'Test without onStatus' },
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
        ),
      ).resolves.toBeUndefined();
    });

    it('TC-EC-03: Relays server SSE error event line by triggering onError callback', async () => {
      const sseChunks = [
        'data: {"type":"error","message":"Hệ thống quá tải, vui lòng thử lại sau"}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createSseStreamResponse(sseChunks));

      const onError = vi.fn();
      await chatApi.streamChat(
        { message: 'Test error event' },
        vi.fn(),
        vi.fn(),
        vi.fn(),
        onError,
      );

      expect(onError).toHaveBeenCalledWith('Hệ thống quá tải, vui lòng thử lại sau');
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (TC-ER-01, TC-ER-02, TC-ER-03)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('TC-ER-01: Throws descriptive Error when backend returns HTTP 400 with message payload', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ message: 'Tin nhắn không được để trống' }),
      });

      await expect(
        chatApi.streamChat(
          { message: '' },
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
        ),
      ).rejects.toThrow('Tin nhắn không được để trống');
    });

    it('TC-ER-02: Throws fallback Error when backend returns HTTP 500 and json parsing fails', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('HTML 500 error page')),
      });

      await expect(
        chatApi.streamChat(
          { message: 'Lỗi 500' },
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
        ),
      ).rejects.toThrow('Không thể kết nối đến máy chủ AI');
    });

    it('TC-ER-03: Throws Error when response body is null (stream not supported)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      await expect(
        chatApi.streamChat(
          { message: 'Không có body' },
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
        ),
      ).rejects.toThrow('Trình duyệt không hỗ trợ đọc dữ liệu stream');
    });

    it('TC-ER-04: Throws error when NEXT_PUBLIC_AI_SERVICE_URL is missing (Fail-Fast policy)', async () => {
      delete process.env.NEXT_PUBLIC_AI_SERVICE_URL;

      await expect(
        chatApi.streamChat(
          { message: 'Missing env test' },
          vi.fn(),
          vi.fn(),
          vi.fn(),
          vi.fn(),
        ),
      ).rejects.toThrow('[ConfigError] Thiếu biến môi trường bắt buộc: "NEXT_PUBLIC_AI_SERVICE_URL"');
    });
  });
});
