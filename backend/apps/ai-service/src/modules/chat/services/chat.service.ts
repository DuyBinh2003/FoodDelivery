import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { RateLimitService } from '@/modules/chat/services/rate-limit.service.js';
import { SessionService } from '@/modules/chat/services/session.service.js';
import {
  LangGraphClientService,
  SseServerEvent,
} from '@/modules/chat/services/langgraph-client.service.js';
import type { AuthenticatedUser } from '@/modules/chat/interfaces/auth-user.interface.js';
import type { ChatRequestDto } from '@/modules/chat/dto/chat-request.dto.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(RateLimitService) private readonly rateLimitService: RateLimitService,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(LangGraphClientService) private readonly langGraphClient: LangGraphClientService,
  ) {}

  async handleChatStream(
    user: AuthenticatedUser,
    dto: ChatRequestDto,
    res: Response,
  ): Promise<void> {
    // 1. Enforce Rate Limiting
    await this.rateLimitService.checkRateLimit(user.id);

    // 2. Resolve or create chat session
    const session = await this.sessionService.getOrCreateSession(
      user.id,
      user.role,
      dto.sessionId,
    );

    // 3. Save incoming user message
    await this.sessionService.saveUserMessage(session.id, dto.message);

    // 4. Fetch recent conversation history
    const history = await this.sessionService.getSessionHistory(session.id, 20);

    // 5. Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let fullAnswer = '';
    const startTime = Date.now();

    const writeSse = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Gửi event session_created / session_info ban đầu cho client
      writeSse({
        type: 'session_init',
        sessionId: session.id,
      });

      const stream = this.langGraphClient.streamQuery({
        user_id: user.id,
        user_role: user.role,
        message: dto.message,
        session_history: history,
        user_location: dto.userLocation ?? null,
        auth_context: {
          id: user.id,
          role: user.role,
          email: user.email,
        },
      });

      let doneEventReceived: SseServerEvent | null = null;

      for await (const event of stream) {
        if (event.type === 'chunk') {
          fullAnswer += event.content;
          writeSse({
            type: 'chunk',
            content: event.content,
          });
        } else if (event.type === 'status') {
          writeSse({
            type: 'status',
            step: event.step,
            message: event.message,
          });
        } else if (event.type === 'done') {
          doneEventReceived = event;
        } else if (event.type === 'error') {
          this.logger.warn(`Error event from LangGraph: ${event.message}`);
          writeSse({
            type: 'error',
            message: event.message,
          });
        }
      }

      const latencyMs = Date.now() - startTime;

      // 6. Persist assistant message
      const doneEvent = doneEventReceived && doneEventReceived.type === 'done' ? doneEventReceived : undefined;
      const assistantMessage = await this.sessionService.saveAssistantMessage({
        sessionId: session.id,
        content: fullAnswer || 'Không thể tạo câu trả lời vào lúc này.',
        intent: doneEvent?.intent,
        modelUsed: doneEvent?.modelUsed,
        contextSources: doneEvent?.contextSources,
        relevanceScore: doneEvent?.relevanceScore,
        tokensUsed: doneEvent?.tokensUsed,
        latencyMs,
        langsmithRunId: doneEvent?.langsmithRunId,
      });

      // 7. Auto-generate title if this is the first turn
      if (!session.title || session.title === 'Cuộc trò chuyện mới') {
        const autoTitle =
          dto.message.length > 35 ? `${dto.message.slice(0, 32)}...` : dto.message;
        await this.sessionService.updateSessionTitle(session.id, autoTitle);
      }

      // 8. Send final done event with message metadata
      writeSse({
        type: 'done',
        sessionId: session.id,
        messageId: assistantMessage.id,
        intent: assistantMessage.intent,
        tokensUsed: assistantMessage.tokensUsed,
        latencyMs,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error during chat stream processing: ${msg}`, { cause: error });
      writeSse({
        type: 'error',
        message: msg || 'Đã có lỗi xảy ra trong quá trình xử lý yêu cầu.',
      });
    } finally {
      res.end();
    }
  }
}
