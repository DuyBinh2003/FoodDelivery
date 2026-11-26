/**
 * @file langgraph-client.service.spec.ts
 * @description Unit tests for LangGraphClientService streaming SSE responses from Python LangGraph service
 * @traceability
 *   - Plan: docs/plans/platform/ai-chatbox-rag-gemini.md # Section 10
 *   - Doc: docs/plans/platform/ai-chatbox-rag-gemini.md
 *   - Use Case: LangGraph HTTP Streaming Client
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import {
  LangGraphClientService,
  type RagQueryPayload,
  type SseServerEvent,
} from '@/modules/chat/services/langgraph-client.service.js';
import type { ConfigService } from '@nestjs/config';

describe('LangGraphClientService - Python Service SSE Streaming Client Suite', () => {
  const originalFetch = globalThis.fetch;
  let clientService: LangGraphClientService;
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  const samplePayload: RagQueryPayload = {
    user_id: 'user-uuid-111',
    user_role: 'CUSTOMER',
    message: 'Gợi ý món bún bò Huế ngon',
    session_history: [],
    user_location: { lat: 10.7765, lng: 106.7009 },
    auth_context: { id: 'user-uuid-111', role: 'CUSTOMER' },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'ai.langgraphUrl') return 'http://localhost:8000';
        return undefined;
      }),
    };

    clientService = new LangGraphClientService(mockConfigService as unknown as ConfigService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // Helper to construct a mock Response with a ReadableStream
  function createMockStreamResponse(chunks: string[], status: number = 200) {
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
  // 1. HAPPY PATH (TC-HP-01, TC-HP-02, TC-HP-03)
  // ==========================================
  describe('Happy Path', () => {
    it('TC-HP-01: Connects to LangGraph service and yields parsed SSE chunk and done events', async () => {
      const sseData = [
        'data: {"type":"chunk","content":"Bún bò Huế "}\n\n',
        'data: {"type":"chunk","content":"Đông Ba rất nổi tiếng."}\n\n',
        'data: {"type":"done","intent":"MENU_RECOMMENDATION","tokensUsed":85}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createMockStreamResponse(sseData));

      const events: SseServerEvent[] = [];
      for await (const event of clientService.streamQuery(samplePayload)) {
        events.push(event);
      }

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/internal/rag/query',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(samplePayload),
        }),
      );

      expect(events).toEqual([
        { type: 'chunk', content: 'Bún bò Huế ' },
        { type: 'chunk', content: 'Đông Ba rất nổi tiếng.' },
        { type: 'done', intent: 'MENU_RECOMMENDATION', tokensUsed: 85 },
      ]);
    });

    it('TC-HP-02: Correctly buffers and parses fragmented SSE chunks split across packets', async () => {
      const fragmentedPackets = [
        'data: {"type":"ch',
        'unk","content":"Chào"}',
        '\n\ndata: {"type":"done"}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createMockStreamResponse(fragmentedPackets));

      const events: SseServerEvent[] = [];
      for await (const event of clientService.streamQuery(samplePayload)) {
        events.push(event);
      }

      expect(events).toEqual([
        { type: 'chunk', content: 'Chào' },
        { type: 'done' },
      ]);
    });

    it('TC-HP-03: Correctly relays in-band error event emitted by Python pipeline', async () => {
      const sseData = [
        'data: {"type":"error","message":"Relevance score dưới ngưỡng và Tavily quota hết"}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createMockStreamResponse(sseData));

      const events: SseServerEvent[] = [];
      for await (const event of clientService.streamQuery(samplePayload)) {
        events.push(event);
      }

      expect(events).toEqual([
        { type: 'error', message: 'Relevance score dưới ngưỡng và Tavily quota hết' },
      ]);
    });

    it('TC-HP-04: Yields status events emitted during CRAG node execution before chunks', async () => {
      const sseData = [
        'data: {"type":"status","step":"starting","message":"Đang phân tích yêu cầu..."}\n\n',
        'data: {"type":"status","step":"retrieving","message":"Đang tìm kiếm thực đơn..."}\n\n',
        'data: {"type":"chunk","content":"Gợi ý phở bò"}\n\n',
        'data: {"type":"done","intent":"MENU_RECOMMENDATION"}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createMockStreamResponse(sseData));

      const events: SseServerEvent[] = [];
      for await (const event of clientService.streamQuery(samplePayload)) {
        events.push(event);
      }

      expect(events).toEqual([
        { type: 'status', step: 'starting', message: 'Đang phân tích yêu cầu...' },
        { type: 'status', step: 'retrieving', message: 'Đang tìm kiếm thực đơn...' },
        { type: 'chunk', content: 'Gợi ý phở bò' },
        { type: 'done', intent: 'MENU_RECOMMENDATION' },
      ]);
    });
  });

  // ==========================================
  // 2. EDGE CASES (TC-EC-01, TC-EC-02, TC-EC-03)
  // ==========================================
  describe('Edge Cases', () => {
    it('TC-EC-01: Ignores comment lines, empty lines, and malformed JSON lines without crashing', async () => {
      const sseData = [
        ': ping heartbeat\n\n',
        '\n\n',
        'data: { invalid-json-chunk }\n\n',
        'data: {"type":"chunk","content":"Hợp lệ"}\n\n',
        'data: {"type":"done"}\n\n',
      ];

      globalThis.fetch = vi.fn().mockResolvedValue(createMockStreamResponse(sseData));

      const events: SseServerEvent[] = [];
      for await (const event of clientService.streamQuery(samplePayload)) {
        events.push(event);
      }

      expect(events).toEqual([
        { type: 'chunk', content: 'Hợp lệ' },
        { type: 'done' },
      ]);
    });

    it('TC-EC-02: Flushes trailing buffer when stream ends without ending newline', async () => {
      const sseData = ['data: {"type":"done","intent":"ORDER_STATUS"}'];

      globalThis.fetch = vi.fn().mockResolvedValue(createMockStreamResponse(sseData));

      const events: SseServerEvent[] = [];
      for await (const event of clientService.streamQuery(samplePayload)) {
        events.push(event);
      }

      expect(events).toEqual([{ type: 'done', intent: 'ORDER_STATUS' }]);
    });

    it('TC-EC-03: Throws error when config is missing (Fail-Fast No-Fallback policy)', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(() => new LangGraphClientService(mockConfigService as unknown as ConfigService)).toThrow(
        'LANGGRAPH_SERVICE_URL is required in configuration. ai-service cannot communicate with AI core without it.',
      );
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (TC-ER-01, TC-ER-02, TC-ER-03)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('TC-ER-01: Throws ServiceUnavailableException when network fetch rejects', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('fetch failed: ECONNREFUSED 127.0.0.1:8000'));

      const generator = clientService.streamQuery(samplePayload);
      await expect(generator.next()).rejects.toThrow(ServiceUnavailableException);
    });

    it('TC-ER-02: Throws ServiceUnavailableException when Python service returns 500 error status', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Internal Server Error in LangGraph' }), {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      );

      const generator = clientService.streamQuery(samplePayload);
      await expect(generator.next()).rejects.toThrow(ServiceUnavailableException);
    });

    it('TC-ER-03: Yields SSE error event if stream reader fails midway', async () => {
      let pullCount = 0;
      const readable = new ReadableStream<Uint8Array>({
        pull(controller) {
          pullCount++;
          if (pullCount === 1) {
            const encoder = new TextEncoder();
            controller.enqueue(encoder.encode('data: {"type":"chunk","content":"Phần 1"}\n\n'));
          } else {
            controller.error(new Error('Network socket terminated abruptly'));
          }
        },
      });

      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(readable, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      );

      const events: SseServerEvent[] = [];
      for await (const event of clientService.streamQuery(samplePayload)) {
        events.push(event);
      }

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ type: 'chunk', content: 'Phần 1' });
      expect(events[1]).toEqual({
        type: 'error',
        message: 'Lỗi gián đoạn khi nhận dữ liệu từ AI',
      });
    });
  });
});
