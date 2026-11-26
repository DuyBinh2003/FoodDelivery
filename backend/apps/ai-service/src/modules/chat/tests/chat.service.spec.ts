/**
 * @file chat.service.spec.ts
 * @description Unit tests for ChatService orchestrating SSE stream, rate limiting, and session persistence
 * @traceability
 *   - Plan: docs/plans/platform/ai-chatbox-rag-gemini.md # Section 10
 *   - Doc: docs/plans/platform/ai-chatbox-rag-gemini.md
 *   - Use Case: AI Chatbox Stream Orchestration
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException, HttpStatus, ServiceUnavailableException, ForbiddenException } from '@nestjs/common';
import { ChatService } from '@/modules/chat/services/chat.service.js';
import type { RateLimitService } from '@/modules/chat/services/rate-limit.service.js';
import type { SessionService } from '@/modules/chat/services/session.service.js';
import type { LangGraphClientService, SseServerEvent } from '@/modules/chat/services/langgraph-client.service.js';
import type { AuthenticatedUser } from '@/modules/chat/interfaces/auth-user.interface.js';
import type { ChatRequestDto } from '@/modules/chat/dto/chat-request.dto.js';
import type { Response } from 'express';

describe('ChatService - SSE Orchestration Suite', () => {
  let chatService: ChatService;
  let mockRateLimitService: {
    checkRateLimit: ReturnType<typeof vi.fn>;
  };
  let mockSessionService: {
    getOrCreateSession: ReturnType<typeof vi.fn>;
    saveUserMessage: ReturnType<typeof vi.fn>;
    getSessionHistory: ReturnType<typeof vi.fn>;
    saveAssistantMessage: ReturnType<typeof vi.fn>;
    updateSessionTitle: ReturnType<typeof vi.fn>;
  };
  let mockLangGraphClient: {
    streamQuery: ReturnType<typeof vi.fn>;
  };
  let mockResponse: {
    setHeader: ReturnType<typeof vi.fn>;
    flushHeaders: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };

  const sampleUser: AuthenticatedUser = {
    id: 'user-uuid-111',
    role: 'CUSTOMER',
    email: 'test@example.com',
  };

  const sampleSession = {
    id: 'session-uuid-222',
    userId: 'user-uuid-111',
    userRole: 'CUSTOMER',
    title: 'Cuộc trò chuyện mới',
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRateLimitService = {
      checkRateLimit: vi.fn().mockResolvedValue(undefined),
    };

    mockSessionService = {
      getOrCreateSession: vi.fn().mockResolvedValue({ ...sampleSession }),
      saveUserMessage: vi.fn().mockResolvedValue({ id: 'msg-user-1' }),
      getSessionHistory: vi.fn().mockResolvedValue([]),
      saveAssistantMessage: vi.fn().mockResolvedValue({
        id: 'msg-assistant-1',
        intent: 'MENU_RECOMMENDATION',
        tokensUsed: 120,
      }),
      updateSessionTitle: vi.fn().mockResolvedValue(undefined),
    };

    mockLangGraphClient = {
      streamQuery: vi.fn(),
    };

    mockResponse = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    };

    chatService = new ChatService(
      mockRateLimitService as unknown as RateLimitService,
      mockSessionService as unknown as SessionService,
      mockLangGraphClient as unknown as LangGraphClientService,
    );
  });

  // Helper generator to simulate SSE stream from LangGraph
  async function* createMockStream(events: SseServerEvent[]): AsyncGenerator<SseServerEvent, void, unknown> {
    for (const event of events) {
      yield event;
    }
  }

  // ==========================================
  // 1. HAPPY PATH (TC-HP-01, TC-HP-02, TC-HP-03)
  // ==========================================
  describe('Happy Path', () => {
    it('TC-HP-01: Streams chunks from LangGraph, accumulates content, persists message, and sends done event', async () => {
      const events: SseServerEvent[] = [
        { type: 'chunk', content: 'Gợi ý cho bạn ' },
        { type: 'chunk', content: 'món phở bò tái gầu ngon.' },
        {
          type: 'done',
          intent: 'MENU_RECOMMENDATION',
          modelUsed: 'gemini-1.5-pro',
          tokensUsed: 150,
          relevanceScore: 0.95,
        },
      ];
      mockLangGraphClient.streamQuery.mockReturnValue(createMockStream(events));

      const dto: ChatRequestDto = {
        message: 'Gợi ý món bún bò ngon gần quận 1',
        userLocation: { lat: 10.7765, lng: 106.7009 },
      };

      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      // Verify headers
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-transform');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockResponse.flushHeaders).toHaveBeenCalled();

      // Verify Rate limit check & session creation
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(sampleUser.id);
      expect(mockSessionService.getOrCreateSession).toHaveBeenCalledWith(sampleUser.id, sampleUser.role, undefined);
      expect(mockSessionService.saveUserMessage).toHaveBeenCalledWith(sampleSession.id, dto.message);

      // Verify LangGraph stream query called with userLocation
      expect(mockLangGraphClient.streamQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: sampleUser.id,
          message: dto.message,
          user_location: { lat: 10.7765, lng: 106.7009 },
        }),
      );

      // Verify chunks and session_init written to response
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"type":"session_init"'));
      expect(mockResponse.write).toHaveBeenCalledWith(expect.stringContaining('"type":"chunk"'));

      // Verify assistant message persisted
      expect(mockSessionService.saveAssistantMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: sampleSession.id,
          content: 'Gợi ý cho bạn món phở bò tái gầu ngon.',
          intent: 'MENU_RECOMMENDATION',
          tokensUsed: 150,
        }),
      );

      // Verify auto-title update for new session
      expect(mockSessionService.updateSessionTitle).toHaveBeenCalledWith(
        sampleSession.id,
        'Gợi ý món bún bò ngon gần quận 1',
      );

      // Verify stream completed
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('TC-HP-02: Retains custom session title if session already had a customized title', async () => {
      mockSessionService.getOrCreateSession.mockResolvedValue({
        ...sampleSession,
        title: 'Tra cứu thực đơn bữa trưa',
      });

      const events: SseServerEvent[] = [
        { type: 'chunk', content: 'Chào bạn, thực đơn gồm...' },
        { type: 'done', intent: 'MENU_RECOMMENDATION' },
      ];
      mockLangGraphClient.streamQuery.mockReturnValue(createMockStream(events));

      const dto: ChatRequestDto = {
        sessionId: 'session-uuid-222',
        message: 'Có món gì mới?',
      };

      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockSessionService.updateSessionTitle).not.toHaveBeenCalled();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('TC-HP-03: Successfully injects existing session history into LangGraph query', async () => {
      const mockHistory = [
        { role: 'user', content: 'Tôi muốn ăn phở' },
        { role: 'assistant', content: 'Bạn thích phở bò hay phở gà?' },
      ];
      mockSessionService.getSessionHistory.mockResolvedValue(mockHistory);

      const events: SseServerEvent[] = [
        { type: 'chunk', content: 'Phở bò tái rất ngon ạ.' },
        { type: 'done', intent: 'MENU_RECOMMENDATION' },
      ];
      mockLangGraphClient.streamQuery.mockReturnValue(createMockStream(events));

      const dto: ChatRequestDto = {
        sessionId: 'session-uuid-222',
        message: 'Phở bò nhé',
      };

      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockLangGraphClient.streamQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          session_history: mockHistory,
        }),
      );
    });
  });

  // ==========================================
  // 2. EDGE CASES (TC-EC-01, TC-EC-02, TC-EC-03, TC-EC-04)
  // ==========================================
  describe('Edge Cases', () => {
    it('TC-EC-01: Auto-title truncates to 32 characters + "..." when first message exceeds 35 characters', async () => {
      const longMessage = 'Tôi muốn tìm quán bún đậu mắm tôm ngon nhất tại khu vực quận 3 có máy lạnh';
      mockLangGraphClient.streamQuery.mockReturnValue(
        createMockStream([{ type: 'done', intent: 'RESTAURANT_SEARCH' }]),
      );

      const dto: ChatRequestDto = { message: longMessage };
      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockSessionService.updateSessionTitle).toHaveBeenCalledWith(
        sampleSession.id,
        `${longMessage.slice(0, 32)}...`,
      );
    });

    it('TC-EC-02: Saves fallback message if LangGraph yields zero chunk events', async () => {
      mockLangGraphClient.streamQuery.mockReturnValue(
        createMockStream([{ type: 'done', intent: 'GENERAL_CHITCHAT' }]),
      );

      const dto: ChatRequestDto = { message: 'Alo' };
      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockSessionService.saveAssistantMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Không thể tạo câu trả lời vào lúc này.',
        }),
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('TC-EC-03: Passes null for user_location when client does not provide location', async () => {
      mockLangGraphClient.streamQuery.mockReturnValue(
        createMockStream([{ type: 'done' }]),
      );

      const dto: ChatRequestDto = { message: 'Xin chào' };
      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockLangGraphClient.streamQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          user_location: null,
        }),
      );
    });

    it('TC-EC-04: Relays in-band SSE error event from stream to client without crashing', async () => {
      const events: SseServerEvent[] = [
        { type: 'chunk', content: 'Đang tra cứu...' },
        { type: 'error', message: 'Tạm thời không truy cập được cơ sở dữ liệu menu' },
        { type: 'done' },
      ];
      mockLangGraphClient.streamQuery.mockReturnValue(createMockStream(events));

      const dto: ChatRequestDto = { message: 'Menu có gì?' };
      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"'),
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('TC-EC-05: Forwards SSE status events from LangGraph stream to client response', async () => {
      const events: SseServerEvent[] = [
        { type: 'status', step: 'starting', message: 'Đang phân tích yêu cầu...' },
        { type: 'chunk', content: 'Xin chào' },
        { type: 'done' },
      ];
      mockLangGraphClient.streamQuery.mockReturnValue(createMockStream(events));

      const dto: ChatRequestDto = { message: 'Xin chào' };
      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('"type":"status","step":"starting"'),
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (TC-ER-01, TC-ER-02, TC-ER-03)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('TC-ER-01: Rejects with rate-limit 429 HttpException before SSE stream initialization', async () => {
      mockRateLimitService.checkRateLimit.mockRejectedValue(
        new HttpException(
          { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Vượt quá giới hạn 20 msg/phút' },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      const dto: ChatRequestDto = { message: 'Spamming message' };
      await expect(
        chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response),
      ).rejects.toThrow(HttpException);

      expect(mockSessionService.saveUserMessage).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });

    it('TC-ER-02: Rejects with ForbiddenException when accessing another user session', async () => {
      mockSessionService.getOrCreateSession.mockRejectedValue(
        new ForbiddenException('Bạn không có quyền truy cập phiên trò chuyện này'),
      );

      const dto: ChatRequestDto = { sessionId: 'other-user-session', message: 'Xem trộm' };
      await expect(
        chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response),
      ).rejects.toThrow(ForbiddenException);

      expect(mockLangGraphClient.streamQuery).not.toHaveBeenCalled();
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });

    it('TC-ER-03: Catches ServiceUnavailableException from LangGraph client during stream and informs user via SSE', async () => {
      mockLangGraphClient.streamQuery.mockImplementation(() => {
        throw new ServiceUnavailableException('Dịch vụ AI đang tạm thời không khả dụng');
      });

      const dto: ChatRequestDto = { message: 'Gọi AI khi Python down' };
      await chatService.handleChatStream(sampleUser, dto, mockResponse as unknown as Response);

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('Dịch vụ AI đang tạm thời không khả dụng'),
      );
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
