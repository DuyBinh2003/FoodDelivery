import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderChatMessage } from '@/modules/chat/entities/order-chat-message.entity.js';
import { OrderChatRepository } from '@/modules/chat/repositories/order-chat.repository.js';
import { ChatService } from '@/modules/chat/chat.service.js';
import { ChatGateway } from '@/modules/chat/chat.gateway.js';
import { ChatController } from '@/modules/chat/chat.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderChatMessage]),
  ],
  controllers: [ChatController],
  providers: [
    OrderChatRepository,
    ChatService,
    ChatGateway,
  ],
  exports: [
    ChatService,
    OrderChatRepository,
    ChatGateway,
  ],
})
export class ChatModule {}
