import { Controller, Get, Post, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from '@/modules/chat/chat.service.js';
import { SendChatMessageDto } from '@/modules/chat/dto/send-chat-message.dto.js';
import { MarkSeenDto } from '@/modules/chat/dto/mark-seen.dto.js';
import { GetMessagesQueryDto } from '@/modules/chat/dto/get-messages-query.dto.js';
import { ChatSenderRole } from '@/modules/chat/enums/chat-sender-role.enum.js';

@Controller('delivery/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('orders/:orderId/messages')
  async getMessages(
    @Param('orderId') orderId: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chatService.getMessages(orderId, query);
  }

  @Post('orders/:orderId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('orderId') orderId: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.sendMessage({
      ...dto,
      order_id: orderId,
    });
  }

  @Post('orders/:orderId/seen')
  @HttpCode(HttpStatus.OK)
  async markSeen(
    @Param('orderId') orderId: string,
    @Body() dto: MarkSeenDto,
  ) {
    return this.chatService.markSeen(orderId, dto.reader_id);
  }

  @Get('quick-replies')
  getQuickReplies(@Query('role') role?: ChatSenderRole) {
    return this.chatService.getQuickReplies(role);
  }
}
