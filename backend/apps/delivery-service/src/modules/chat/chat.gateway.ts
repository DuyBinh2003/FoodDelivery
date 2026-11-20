import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '@/modules/chat/chat.service.js';
import { SendChatMessageDto } from '@/modules/chat/dto/send-chat-message.dto.js';
import type { ChatSenderRole } from '@/modules/chat/enums/chat-sender-role.enum.js';

@WebSocketGateway({
  namespace: 'delivery',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly chatService: ChatService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Chat client connected to /delivery: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Chat client disconnected from /delivery: ${client.id}`);
  }

  @SubscribeMessage('chat:join')
  async handleChatJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; userId: string; role?: ChatSenderRole },
  ) {
    if (!data?.orderId) {
      return { error: 'orderId is required' };
    }

    const room = `chat_order_${data.orderId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} (user: ${data.userId}) joined chat room ${room}`);

    const history = await this.chatService.getMessages(data.orderId);
    const quickReplies = this.chatService.getQuickReplies(data.role);

    client.emit('chat:joined', {
      orderId: data.orderId,
      messages: history.messages,
      total: history.total,
      quickReplies,
      isReadOnly: false,
    });

    return { success: true, room };
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: SendChatMessageDto,
  ) {
    try {
      const savedMessage = await this.chatService.sendMessage(data);
      const room = `chat_order_${data.order_id}`;

      // Broadcast tin nhắn mới tới toàn bộ thành viên trong phòng chat của đơn hàng
      this.server.to(room).emit('chat:new_message', savedMessage);

      return { success: true, message: savedMessage };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi gửi tin nhắn';
      this.logger.error(`Error sending chat message in order ${data?.order_id}: ${message}`);
      return { success: false, error: message };
    }
  }

  @SubscribeMessage('chat:mark_seen')
  async handleMarkSeen(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { orderId: string; readerId: string },
  ) {
    if (!data?.orderId || !data?.readerId) {
      return { error: 'orderId and readerId are required' };
    }

    const result = await this.chatService.markSeen(data.orderId, data.readerId);
    const room = `chat_order_${data.orderId}`;

    this.server.to(room).emit('chat:seen', {
      orderId: data.orderId,
      readerId: data.readerId,
      readAt: result.readAt,
      affected: result.affected,
    });

    return { success: true, affected: result.affected };
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      orderId: string;
      userId: string;
      userName: string;
      role: string;
      isTyping: boolean;
    },
  ) {
    if (!data?.orderId) return;
    const room = `chat_order_${data.orderId}`;
    // Broadcast trạng thái gõ phím tới các thành viên khác trong phòng
    client.to(room).emit('chat:typing', data);
  }
}
