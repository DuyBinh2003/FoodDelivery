import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OrderChatRepository } from '@/modules/chat/repositories/order-chat.repository.js';
import type { SendChatMessageDto } from '@/modules/chat/dto/send-chat-message.dto.js';
import type { GetMessagesQueryDto } from '@/modules/chat/dto/get-messages-query.dto.js';
import { ChatMessageType } from '@/modules/chat/enums/chat-message-type.enum.js';
import { ChatSenderRole } from '@/modules/chat/enums/chat-sender-role.enum.js';
import { DEFAULT_QUICK_REPLIES, type QuickReplyItem } from '@/modules/chat/dto/quick-reply.dto.js';
import type { OrderChatMessage } from '@/modules/chat/entities/order-chat-message.entity.js';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly orderChatRepo: OrderChatRepository) {}

  async sendMessage(
    dto: SendChatMessageDto,
    isRoomClosed: boolean = false,
  ): Promise<OrderChatMessage> {
    if (!dto.order_id || !dto.sender_id) {
      throw new BadRequestException('Mã đơn hàng (order_id) và người gửi (sender_id) là bắt buộc.');
    }

    if (!dto.sender_role || !Object.values(ChatSenderRole).includes(dto.sender_role)) {
      throw new BadRequestException('Vai trò người gửi (sender_role) không hợp lệ.');
    }

    if (isRoomClosed) {
      throw new BadRequestException('Phòng chat của đơn hàng này đã đóng (chế độ chỉ đọc).');
    }

    const trimmedContent = dto.content?.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống.');
    }

    if (trimmedContent.length > 1000) {
      throw new BadRequestException('Nội dung tin nhắn không được vượt quá 1000 ký tự.');
    }

    const messageType = dto.message_type ?? ChatMessageType.TEXT;

    const saved = await this.orderChatRepo.createMessage({
      order_id: dto.order_id,
      sender_id: dto.sender_id,
      sender_role: dto.sender_role,
      sender_name: dto.sender_name.trim(),
      message_type: messageType,
      content: trimmedContent,
      is_read: false,
      read_at: null,
    });

    this.logger.debug(
      `[ChatService] Saved message ${saved.id} in order ${dto.order_id} from ${dto.sender_role} (${dto.sender_name})`,
    );

    return saved;
  }

  async getMessages(
    orderId: string,
    query?: GetMessagesQueryDto,
  ): Promise<{ messages: OrderChatMessage[]; total: number }> {
    if (!orderId) {
      throw new BadRequestException('orderId là bắt buộc.');
    }

    const limit = query?.limit ?? 50;
    const offset = query?.offset ?? 0;

    return this.orderChatRepo.findMessagesByOrderId(orderId, limit, offset);
  }

  async markSeen(
    orderId: string,
    readerId: string,
  ): Promise<{ affected: number; readAt: Date }> {
    if (!orderId || !readerId) {
      throw new BadRequestException('orderId và readerId là bắt buộc.');
    }

    const affected = await this.orderChatRepo.markSeen(orderId, readerId);
    return {
      affected,
      readAt: new Date(),
    };
  }

  getQuickReplies(role?: ChatSenderRole): QuickReplyItem[] {
    if (role) {
      return DEFAULT_QUICK_REPLIES.filter((item) => item.role === role);
    }
    return DEFAULT_QUICK_REPLIES;
  }
}
