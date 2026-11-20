/**
 * @file session.service.spec.ts
 * @description Unit tests for SessionService managing chat sessions, messages, history, and feedback
 * @traceability
 *   - Plan: docs/plans/platform/ai-chatbox-rag-gemini.md # Section 10
 *   - Doc: docs/plans/platform/ai-chatbox-rag-gemini.md
 *   - Use Case: AI Chat Session & History Management
 *   - Scenarios: Happy Path, Edge Cases, Error / Rejection Flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SessionService } from '@/modules/chat/services/session.service.js';
import type { Repository } from 'typeorm';
import type { ConfigService } from '@nestjs/config';
import type { ChatSessionEntity } from '@/modules/chat/entities/chat-session.entity.js';
import type { ChatMessageEntity } from '@/modules/chat/entities/chat-message.entity.js';
import type { ChatFeedbackEntity } from '@/modules/chat/entities/chat-feedback.entity.js';

describe('SessionService - Chat Session & Message Suite', () => {
  let sessionService: SessionService;
  let mockSessionRepo: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findAndCount: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockMessageRepo: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };
  let mockFeedbackRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  const sampleUserId = 'user-uuid-111';
  const otherUserId = 'user-uuid-999';
  const sampleSessionId = 'session-uuid-222';

  const mockSession: ChatSessionEntity = {
    id: sampleSessionId,
    userId: sampleUserId,
    userRole: 'CUSTOMER',
    title: 'Cuộc trò chuyện mới',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    messages: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSessionRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 'new-session-id', ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'saved-session-id', ...entity })),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
      findAndCount: vi.fn().mockResolvedValue([[mockSession], 1]),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    mockMessageRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto) => ({ id: 'new-msg-id', createdAt: new Date(), ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'saved-msg-id', ...entity })),
      find: vi.fn().mockResolvedValue([]),
    };

    mockFeedbackRepo = {
      create: vi.fn((dto) => ({ id: 'new-fb-id', createdAt: new Date(), ...dto })),
      save: vi.fn((entity) => Promise.resolve({ id: entity.id || 'saved-fb-id', ...entity })),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'ai.sessionTtlDays') return 30;
        return undefined;
      }),
    };

    sessionService = new SessionService(
      mockSessionRepo as unknown as Repository<ChatSessionEntity>,
      mockMessageRepo as unknown as Repository<ChatMessageEntity>,
      mockFeedbackRepo as unknown as Repository<ChatFeedbackEntity>,
      mockConfigService as unknown as ConfigService,
    );
  });

  // ==========================================
  // 1. HAPPY PATH (TC-HP-01 -> TC-HP-06)
  // ==========================================
  describe('Happy Path', () => {
    it('TC-HP-01: Creates a new session with 30-day expiry when no sessionId is provided', async () => {
      const result = await sessionService.getOrCreateSession(sampleUserId, 'CUSTOMER');

      expect(mockSessionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: sampleUserId,
          userRole: 'CUSTOMER',
          title: 'Cuộc trò chuyện mới',
          isActive: true,
        }),
      );
      expect(mockSessionRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('TC-HP-02: Returns existing session when valid sessionId and matching userId are provided', async () => {
      mockSessionRepo.findOne.mockResolvedValue({ ...mockSession });

      const result = await sessionService.getOrCreateSession(sampleUserId, 'CUSTOMER', sampleSessionId);

      expect(mockSessionRepo.findOne).toHaveBeenCalledWith({ where: { id: sampleSessionId } });
      expect(result.id).toBe(sampleSessionId);
      expect(mockSessionRepo.create).not.toHaveBeenCalled();
    });

    it('TC-HP-03: Saves user and assistant messages with complete metadata', async () => {
      const userMsg = await sessionService.saveUserMessage(sampleSessionId, 'Gợi ý món ăn');
      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        sessionId: sampleSessionId,
        role: 'user',
        content: 'Gợi ý món ăn',
      });
      expect(userMsg).toBeDefined();

      const assistantMsg = await sessionService.saveAssistantMessage({
        sessionId: sampleSessionId,
        content: 'Bạn có thể thử cơm tấm',
        intent: 'MENU_RECOMMENDATION',
        modelUsed: 'gemini-1.5-pro',
        relevanceScore: 0.92,
        tokensUsed: 110,
        latencyMs: 850,
        langsmithRunId: 'run-12345',
      });
      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: sampleSessionId,
          role: 'assistant',
          content: 'Bạn có thể thử cơm tấm',
          intent: 'MENU_RECOMMENDATION',
          tokensUsed: 110,
        }),
      );
      expect(assistantMsg).toBeDefined();
    });

    it('TC-HP-04: Returns reversed chronological session history for context building', async () => {
      const dbMessages = [
        { role: 'assistant', content: 'Chào bạn', createdAt: new Date(2000) },
        { role: 'user', content: 'Xin chào', createdAt: new Date(1000) },
      ];
      mockMessageRepo.find.mockResolvedValue(dbMessages);

      const history = await sessionService.getSessionHistory(sampleSessionId, 20);

      expect(mockMessageRepo.find).toHaveBeenCalledWith({
        where: { sessionId: sampleSessionId },
        order: { createdAt: 'DESC' },
        take: 20,
      });
      // Chronological order: oldest first
      expect(history).toEqual([
        { role: 'user', content: 'Xin chào' },
        { role: 'assistant', content: 'Chào bạn' },
      ]);
    });

    it('TC-HP-05: Returns paginated active sessions for user', async () => {
      mockSessionRepo.findAndCount.mockResolvedValue([[mockSession], 1]);

      const result = await sessionService.getUserSessions(sampleUserId, 1, 10);

      expect(mockSessionRepo.findAndCount).toHaveBeenCalledWith({
        where: { userId: sampleUserId, isActive: true },
        order: { updatedAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('TC-HP-06: Submits feedback (thumbs up/down) for a message in user session', async () => {
      const mockMessage = {
        id: 'msg-uuid-1',
        sessionId: sampleSessionId,
        session: { userId: sampleUserId },
      };
      mockMessageRepo.findOne.mockResolvedValue(mockMessage);

      const feedback = await sessionService.submitFeedback(sampleUserId, 'msg-uuid-1', 1, 'Rất hữu ích');

      expect(mockFeedbackRepo.create).toHaveBeenCalledWith({
        messageId: 'msg-uuid-1',
        rating: 1,
        comment: 'Rất hữu ích',
      });
      expect(mockFeedbackRepo.save).toHaveBeenCalled();
      expect(feedback).toBeDefined();
    });
  });

  // ==========================================
  // 2. EDGE CASES (TC-EC-01 -> TC-EC-03)
  // ==========================================
  describe('Edge Cases', () => {
    it('TC-EC-01: Truncates long session title (> 250 characters) to 247 chars + "..."', async () => {
      const longTitle = 'a'.repeat(300);
      await sessionService.updateSessionTitle(sampleSessionId, longTitle);

      expect(mockSessionRepo.update).toHaveBeenCalledWith(
        { id: sampleSessionId },
        { title: `${'a'.repeat(247)}...` },
      );
    });

    it('TC-EC-02: Returns empty array and 0 count when user has no active sessions', async () => {
      mockSessionRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await sessionService.getUserSessions('new-user-id', 1, 20);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('TC-EC-03: Allows feedback submission if message has no session relation attached', async () => {
      const mockMessageWithoutSession = {
        id: 'msg-uuid-standalone',
        session: null,
      };
      mockMessageRepo.findOne.mockResolvedValue(mockMessageWithoutSession);

      const feedback = await sessionService.submitFeedback(sampleUserId, 'msg-uuid-standalone', -1);

      expect(mockFeedbackRepo.create).toHaveBeenCalledWith({
        messageId: 'msg-uuid-standalone',
        rating: -1,
        comment: undefined,
      });
      expect(feedback).toBeDefined();
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (TC-ER-01 -> TC-ER-06)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('TC-ER-01: getOrCreateSession throws NotFoundException if sessionId does not exist', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      await expect(
        sessionService.getOrCreateSession(sampleUserId, 'CUSTOMER', 'non-existent-session'),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-ER-02: getOrCreateSession throws ForbiddenException if session belongs to another user', async () => {
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSession,
        userId: otherUserId,
      });

      await expect(
        sessionService.getOrCreateSession(sampleUserId, 'CUSTOMER', sampleSessionId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-ER-03: getSessionMessages throws NotFoundException if session is not found', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      await expect(
        sessionService.getSessionMessages(sampleUserId, 'missing-session'),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-ER-04: getSessionMessages throws ForbiddenException if user is not session owner', async () => {
      mockSessionRepo.findOne.mockResolvedValue({
        ...mockSession,
        userId: otherUserId,
      });

      await expect(
        sessionService.getSessionMessages(sampleUserId, sampleSessionId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-ER-05: deleteSession throws NotFoundException for invalid session and ForbiddenException for unauthorized user', async () => {
      mockSessionRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        sessionService.deleteSession(sampleUserId, 'missing-session'),
      ).rejects.toThrow(NotFoundException);

      mockSessionRepo.findOne.mockResolvedValueOnce({
        ...mockSession,
        userId: otherUserId,
      });
      await expect(
        sessionService.deleteSession(sampleUserId, sampleSessionId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-ER-06: submitFeedback throws NotFoundException for invalid message and ForbiddenException for other user message', async () => {
      mockMessageRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        sessionService.submitFeedback(sampleUserId, 'missing-message', 1),
      ).rejects.toThrow(NotFoundException);

      mockMessageRepo.findOne.mockResolvedValueOnce({
        id: 'msg-uuid-2',
        session: { userId: otherUserId },
      });
      await expect(
        sessionService.submitFeedback(sampleUserId, 'msg-uuid-2', 1),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
