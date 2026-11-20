/**
 * @file order-chat.spec.ts
 * @description Unit tests for In-App Realtime Order Chat (Delivery/Customer/Restaurant) via WebSocket & REST
 *
 * Traceability Matrix:
 * - Module: Delivery Service - Chat Module
 * - Task Code: realtime-order-chat
 * - Issue: #76 (Kênh Chat thời gian thực Khách hàng - Tài xế - Nhà hàng qua WebSocket)
 * - Plan: docs/plans/customer/realtime-order-chat.md
 *
 * Test Scenarios:
 * 1. Happy Path (HP-01 -> HP-06):
 *    - HP-01: Gửi tin nhắn TEXT thành công với đầy đủ metadata.
 *    - HP-02: Gửi tin nhắn QUICK_REPLY thành công.
 *    - HP-03: Đánh dấu đã xem (markSeen) cập nhật is_read = true và read_at.
 *    - HP-04: Lấy danh sách tin nhắn theo thứ tự created_at ASC.
 *    - HP-05: ChatGateway: client chat:join nhận được lịch sử tin nhắn và quick replies.
 *    - HP-06: ChatGateway: client chat:send broadcast sự kiện chat:new_message tới room.
 * 2. Edge Cases (EC-01 -> EC-05):
 *    - EC-01: Tin nhắn dài chạm trần 1000 ký tự.
 *    - EC-02: Tin nhắn có khoảng trắng đầu/cuối được tự động trim sạch.
 *    - EC-03: Lọc quick replies chuẩn xác theo vai trò (DRIVER, CUSTOMER, RESTAURANT).
 *    - EC-04: Lấy lịch sử đơn hàng chưa có tin nhắn nào (trả về [] và total = 0).
 *    - EC-05: Đánh dấu đã xem khi không có tin nhắn nào chưa đọc (affected = 0).
 * 3. Error Flow (ERR-01 -> ERR-06):
 *    - ERR-01: Gửi tin nhắn rỗng hoặc chỉ có khoảng trắng -> ném BadRequestException.
 *    - ERR-02: Thiếu order_id hoặc sender_id -> ném BadRequestException.
 *    - ERR-03: Vai trò người gửi sender_role không hợp lệ -> ném BadRequestException.
 *    - ERR-04: Tin nhắn vượt quá 1000 ký tự -> ném BadRequestException.
 *    - ERR-05: Gửi tin nhắn khi phòng chat đã đóng (isRoomClosed = true) -> ném BadRequestException.
 *    - ERR-06: Gọi markSeen thiếu orderId hoặc readerId -> ném BadRequestException.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ChatService } from '@/modules/chat/chat.service.js';
import { ChatGateway } from '@/modules/chat/chat.gateway.js';
import { ChatSenderRole } from '@/modules/chat/enums/chat-sender-role.enum.js';
import { ChatMessageType } from '@/modules/chat/enums/chat-message-type.enum.js';
import type { OrderChatMessage } from '@/modules/chat/entities/order-chat-message.entity.js';
import type { OrderChatRepository } from '@/modules/chat/repositories/order-chat.repository.js';
import type { Server, Socket } from 'socket.io';

describe('Realtime Order Chat Module (Issue #76)', () => {
  let chatService: ChatService;
  let chatGateway: ChatGateway;

  let mockChatRepo: {
    createMessage: ReturnType<typeof vi.fn>;
    findMessagesByOrderId: ReturnType<typeof vi.fn>;
    markSeen: ReturnType<typeof vi.fn>;
    countUnread: ReturnType<typeof vi.fn>;
  };

  let mockSocketServer: {
    to: ReturnType<typeof vi.fn>;
  };

  let mockRoomEmitter: {
    emit: ReturnType<typeof vi.fn>;
  };

  let mockClientSocket: {
    id: string;
    join: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
    to: ReturnType<typeof vi.fn>;
  };

  const sampleMessage: OrderChatMessage = {
    id: 'msg-uuid-001',
    order_id: 'ord-uuid-123',
    sender_id: 'cust-uuid-456',
    sender_role: ChatSenderRole.CUSTOMER,
    sender_name: 'Nguyễn Văn A',
    message_type: ChatMessageType.TEXT,
    content: 'Tôi đang đứng ở sảnh A nhé bạn tài xế!',
    is_read: false,
    read_at: null,
    created_at: new Date('2026-10-21T10:00:00Z'),
    is_deleted: false,
  };

  beforeEach(() => {
    mockChatRepo = {
      createMessage: vi.fn(),
      findMessagesByOrderId: vi.fn(),
      markSeen: vi.fn(),
      countUnread: vi.fn(),
    };

    mockRoomEmitter = {
      emit: vi.fn(),
    };

    mockSocketServer = {
      to: vi.fn().mockReturnValue(mockRoomEmitter),
    };

    mockClientSocket = {
      id: 'socket-client-123',
      join: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      to: vi.fn().mockReturnValue(mockRoomEmitter),
    };

    chatService = new ChatService(mockChatRepo as unknown as OrderChatRepository);
    chatGateway = new ChatGateway(chatService);
    chatGateway.server = mockSocketServer as unknown as Server;
  });

  // ==========================================
  // NHÁNH 1: HAPPY PATH (HP-01 -> HP-06)
  // ==========================================
  describe('Nhánh 1: Happy Path', () => {
    it('HP-01: Gửi tin nhắn TEXT thành công với đầy đủ metadata', async () => {
      mockChatRepo.createMessage.mockResolvedValue(sampleMessage);

      const result = await chatService.sendMessage({
        order_id: 'ord-uuid-123',
        sender_id: 'cust-uuid-456',
        sender_role: ChatSenderRole.CUSTOMER,
        sender_name: 'Nguyễn Văn A',
        message_type: ChatMessageType.TEXT,
        content: 'Tôi đang đứng ở sảnh A nhé bạn tài xế!',
      });

      expect(result).toEqual(sampleMessage);
      expect(mockChatRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'ord-uuid-123',
          sender_id: 'cust-uuid-456',
          content: 'Tôi đang đứng ở sảnh A nhé bạn tài xế!',
          is_read: false,
        }),
      );
    });

    it('HP-02: Gửi tin nhắn QUICK_REPLY thành công', async () => {
      const quickReplyMsg: OrderChatMessage = {
        ...sampleMessage,
        message_type: ChatMessageType.QUICK_REPLY,
        content: 'Tôi đã tới điểm giao, mời bạn ra nhận món nhé',
        sender_role: ChatSenderRole.DRIVER,
        sender_name: 'Trần Tài Xế',
      };
      mockChatRepo.createMessage.mockResolvedValue(quickReplyMsg);

      const result = await chatService.sendMessage({
        order_id: 'ord-uuid-123',
        sender_id: 'driver-uuid-789',
        sender_role: ChatSenderRole.DRIVER,
        sender_name: 'Trần Tài Xế',
        message_type: ChatMessageType.QUICK_REPLY,
        content: 'Tôi đã tới điểm giao, mời bạn ra nhận món nhé',
      });

      expect(result.message_type).toBe(ChatMessageType.QUICK_REPLY);
      expect(result.sender_role).toBe(ChatSenderRole.DRIVER);
    });

    it('HP-03: Đánh dấu đã xem (markSeen) cập nhật is_read = true và read_at', async () => {
      mockChatRepo.markSeen.mockResolvedValue(3); // 3 tin nhắn được xem

      const result = await chatService.markSeen('ord-uuid-123', 'cust-uuid-456');

      expect(result.affected).toBe(3);
      expect(result.readAt).toBeInstanceOf(Date);
      expect(mockChatRepo.markSeen).toHaveBeenCalledWith('ord-uuid-123', 'cust-uuid-456');
    });

    it('HP-04: Lấy danh sách tin nhắn theo thứ tự created_at ASC', async () => {
      mockChatRepo.findMessagesByOrderId.mockResolvedValue({
        messages: [sampleMessage],
        total: 1,
      });

      const result = await chatService.getMessages('ord-uuid-123', { limit: 20, offset: 0 });

      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockChatRepo.findMessagesByOrderId).toHaveBeenCalledWith('ord-uuid-123', 20, 0);
    });

    it('HP-05: ChatGateway: client chat:join nhận được lịch sử tin nhắn và quick replies', async () => {
      mockChatRepo.findMessagesByOrderId.mockResolvedValue({
        messages: [sampleMessage],
        total: 1,
      });

      const joinResult = await chatGateway.handleChatJoin(mockClientSocket as unknown as Socket, {
        orderId: 'ord-uuid-123',
        userId: 'cust-uuid-456',
        role: ChatSenderRole.CUSTOMER,
      });

      expect(joinResult.success).toBe(true);
      expect(mockClientSocket.join).toHaveBeenCalledWith('chat_order_ord-uuid-123');
      expect(mockClientSocket.emit).toHaveBeenCalledWith(
        'chat:joined',
        expect.objectContaining({
          orderId: 'ord-uuid-123',
          messages: [sampleMessage],
          isReadOnly: false,
        }),
      );
    });

    it('HP-06: ChatGateway: client chat:send broadcast sự kiện chat:new_message tới room', async () => {
      mockChatRepo.createMessage.mockResolvedValue(sampleMessage);

      const sendResult = await chatGateway.handleChatSend(mockClientSocket as unknown as Socket, {
        order_id: 'ord-uuid-123',
        sender_id: 'cust-uuid-456',
        sender_role: ChatSenderRole.CUSTOMER,
        sender_name: 'Nguyễn Văn A',
        content: 'Tôi đang đứng ở sảnh A nhé bạn tài xế!',
      });

      expect(sendResult.success).toBe(true);
      expect(mockSocketServer.to).toHaveBeenCalledWith('chat_order_ord-uuid-123');
      expect(mockRoomEmitter.emit).toHaveBeenCalledWith('chat:new_message', sampleMessage);
    });
  });

  // ==========================================
  // NHÁNH 2: EDGE CASES (EC-01 -> EC-05)
  // ==========================================
  describe('Nhánh 2: Edge Cases', () => {
    it('EC-01: Tin nhắn dài chạm trần tối đa 1000 ký tự', async () => {
      const maxContent = 'a'.repeat(1000);
      mockChatRepo.createMessage.mockResolvedValue({ ...sampleMessage, content: maxContent });

      const result = await chatService.sendMessage({
        order_id: 'ord-uuid-123',
        sender_id: 'cust-uuid-456',
        sender_role: ChatSenderRole.CUSTOMER,
        sender_name: 'Nguyễn Văn A',
        content: maxContent,
      });

      expect(result.content.length).toBe(1000);
    });

    it('EC-02: Tin nhắn có khoảng trắng đầu và cuối được tự động trim', async () => {
      mockChatRepo.createMessage.mockImplementation((dto) => Promise.resolve({ ...sampleMessage, ...dto }));

      await chatService.sendMessage({
        order_id: 'ord-uuid-123',
        sender_id: 'cust-uuid-456',
        sender_role: ChatSenderRole.CUSTOMER,
        sender_name: 'Nguyễn Văn A',
        content: '   Xin chào tài xế!   ',
      });

      expect(mockChatRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Xin chào tài xế!',
        }),
      );
    });

    it('EC-03: Lọc quick replies chuẩn xác theo vai trò (DRIVER, CUSTOMER, RESTAURANT)', () => {
      const driverReplies = chatService.getQuickReplies(ChatSenderRole.DRIVER);
      expect(driverReplies.length).toBeGreaterThan(0);
      expect(driverReplies.every((item) => item.role === ChatSenderRole.DRIVER)).toBe(true);

      const customerReplies = chatService.getQuickReplies(ChatSenderRole.CUSTOMER);
      expect(customerReplies.length).toBeGreaterThan(0);
      expect(customerReplies.every((item) => item.role === ChatSenderRole.CUSTOMER)).toBe(true);
    });

    it('EC-04: Lấy lịch sử của đơn hàng chưa có tin nhắn nào (trả về [] và total = 0)', async () => {
      mockChatRepo.findMessagesByOrderId.mockResolvedValue({ messages: [], total: 0 });

      const result = await chatService.getMessages('ord-empty');

      expect(result.messages).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('EC-05: Đánh dấu đã xem khi không có tin nhắn nào chưa đọc (affected = 0)', async () => {
      mockChatRepo.markSeen.mockResolvedValue(0);

      const result = await chatService.markSeen('ord-uuid-123', 'cust-uuid-456');

      expect(result.affected).toBe(0);
      expect(result.readAt).toBeInstanceOf(Date);
    });
  });

  // ==========================================
  // NHÁNH 3: ERROR / REJECTION FLOW (ERR-01 -> ERR-06)
  // ==========================================
  describe('Nhánh 3: Error / Rejection Flow', () => {
    it('ERR-01: Gửi tin nhắn rỗng hoặc chỉ có khoảng trắng -> ném BadRequestException', async () => {
      await expect(
        chatService.sendMessage({
          order_id: 'ord-uuid-123',
          sender_id: 'cust-uuid-456',
          sender_role: ChatSenderRole.CUSTOMER,
          sender_name: 'Nguyễn Văn A',
          content: '    ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-02: Thiếu order_id hoặc sender_id -> ném BadRequestException', async () => {
      await expect(
        chatService.sendMessage({
          order_id: '',
          sender_id: 'cust-uuid-456',
          sender_role: ChatSenderRole.CUSTOMER,
          sender_name: 'Nguyễn Văn A',
          content: 'Hello',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-03: Vai trò người gửi sender_role không hợp lệ -> ném BadRequestException', async () => {
      await expect(
        chatService.sendMessage({
          order_id: 'ord-uuid-123',
          sender_id: 'cust-uuid-456',
          sender_role: 'INVALID_ROLE' as unknown as ChatSenderRole,
          sender_name: 'Nguyễn Văn A',
          content: 'Hello',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-04: Tin nhắn vượt quá 1000 ký tự -> ném BadRequestException', async () => {
      const overContent = 'a'.repeat(1001);

      await expect(
        chatService.sendMessage({
          order_id: 'ord-uuid-123',
          sender_id: 'cust-uuid-456',
          sender_role: ChatSenderRole.CUSTOMER,
          sender_name: 'Nguyễn Văn A',
          content: overContent,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-05: Gửi tin nhắn khi phòng chat đã đóng (isRoomClosed = true) -> ném BadRequestException', async () => {
      await expect(
        chatService.sendMessage(
          {
            order_id: 'ord-uuid-123',
            sender_id: 'cust-uuid-456',
            sender_role: ChatSenderRole.CUSTOMER,
            sender_name: 'Nguyễn Văn A',
            content: 'Đơn đã xong nhưng vẫn muốn nhắn',
          },
          true, // isRoomClosed
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ERR-06: Gọi markSeen thiếu orderId hoặc readerId -> ném BadRequestException', async () => {
      await expect(chatService.markSeen('', 'cust-uuid-456')).rejects.toThrow(BadRequestException);
      await expect(chatService.markSeen('ord-uuid-123', '')).rejects.toThrow(BadRequestException);
    });
  });
});
