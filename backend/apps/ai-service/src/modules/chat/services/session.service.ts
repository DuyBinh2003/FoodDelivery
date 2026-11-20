import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ChatSessionEntity } from '@/modules/chat/entities/chat-session.entity.js';
import { ChatMessageEntity } from '@/modules/chat/entities/chat-message.entity.js';
import { ChatFeedbackEntity } from '@/modules/chat/entities/chat-feedback.entity.js';

export interface SaveAssistantMessageInput {
  sessionId: string;
  content: string;
  intent?: string;
  modelUsed?: string;
  contextSources?: Record<string, unknown>[];
  relevanceScore?: number;
  tokensUsed?: number;
  latencyMs?: number;
  langsmithRunId?: string;
}

export interface SessionHistoryItem {
  role: string;
  content: string;
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(ChatSessionEntity)
    private readonly sessionRepo: Repository<ChatSessionEntity>,
    @InjectRepository(ChatMessageEntity)
    private readonly messageRepo: Repository<ChatMessageEntity>,
    @InjectRepository(ChatFeedbackEntity)
    private readonly feedbackRepo: Repository<ChatFeedbackEntity>,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  async getOrCreateSession(
    userId: string,
    userRole: string,
    sessionId?: string,
  ): Promise<ChatSessionEntity> {
    if (sessionId) {
      const existing = await this.sessionRepo.findOne({
        where: { id: sessionId },
      });

      if (!existing) {
        throw new NotFoundException(`Không tìm thấy phiên trò chuyện với ID: ${sessionId}`);
      }

      if (existing.userId !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập phiên trò chuyện này');
      }

      return existing;
    }

    const ttlDays = this.configService.get<number>('ai.sessionTtlDays') || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);

    const newSession = this.sessionRepo.create({
      userId,
      userRole,
      title: 'Cuộc trò chuyện mới',
      isActive: true,
      expiresAt,
    });

    return this.sessionRepo.save(newSession);
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    const truncated = title.length > 250 ? `${title.slice(0, 247)}...` : title;
    await this.sessionRepo.update({ id: sessionId }, { title: truncated });
  }

  async saveUserMessage(sessionId: string, content: string): Promise<ChatMessageEntity> {
    const msg = this.messageRepo.create({
      sessionId,
      role: 'user',
      content,
    });
    return this.messageRepo.save(msg);
  }

  async saveAssistantMessage(input: SaveAssistantMessageInput): Promise<ChatMessageEntity> {
    const msg = this.messageRepo.create({
      sessionId: input.sessionId,
      role: 'assistant',
      content: input.content,
      intent: input.intent,
      modelUsed: input.modelUsed,
      contextSources: input.contextSources,
      relevanceScore: input.relevanceScore,
      tokensUsed: input.tokensUsed,
      latencyMs: input.latencyMs,
      langsmithRunId: input.langsmithRunId,
    });
    return this.messageRepo.save(msg);
  }

  async getSessionHistory(
    sessionId: string,
    limit: number = 20,
  ): Promise<SessionHistoryItem[]> {
    const messages = await this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return messages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async getUserSessions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: ChatSessionEntity[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.sessionRepo.findAndCount({
      where: { userId, isActive: true },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  async getSessionMessages(
    userId: string,
    sessionId: string,
  ): Promise<ChatMessageEntity[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy phiên trò chuyện`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập phiên trò chuyện này');
    }

    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      relations: { feedbacks: true },
    });
  }

  async deleteSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Không tìm thấy phiên trò chuyện`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác phiên trò chuyện này');
    }

    await this.sessionRepo.delete({ id: sessionId });
  }

  async submitFeedback(
    userId: string,
    messageId: string,
    rating: number,
    comment?: string,
  ): Promise<ChatFeedbackEntity> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { session: true },
    });

    if (!message) {
      throw new NotFoundException(`Không tìm thấy tin nhắn với ID: ${messageId}`);
    }

    if (message.session && message.session.userId !== userId) {
      throw new ForbiddenException('Bạn không thể gửi đánh giá cho tin nhắn này');
    }

    const feedback = this.feedbackRepo.create({
      messageId,
      rating,
      comment,
    });

    return this.feedbackRepo.save(feedback);
  }
}
