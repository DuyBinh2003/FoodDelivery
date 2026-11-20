import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ChatSessionEntity } from '@/modules/chat/entities/chat-session.entity.js';
import { ChatMessageEntity } from '@/modules/chat/entities/chat-message.entity.js';
import { ChatFeedbackEntity } from '@/modules/chat/entities/chat-feedback.entity.js';
import { ChatController } from '@/modules/chat/chat.controller.js';
import { ChatService } from '@/modules/chat/services/chat.service.js';
import { SessionService } from '@/modules/chat/services/session.service.js';
import { LangGraphClientService } from '@/modules/chat/services/langgraph-client.service.js';
import { RateLimitService } from '@/modules/chat/services/rate-limit.service.js';
import { JwtStrategy } from '@/modules/chat/strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([
      ChatSessionEntity,
      ChatMessageEntity,
      ChatFeedbackEntity,
    ]),
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    SessionService,
    LangGraphClientService,
    RateLimitService,
    JwtStrategy,
  ],
  exports: [
    ChatService,
    SessionService,
    LangGraphClientService,
    RateLimitService,
  ],
})
export class ChatModule {}
