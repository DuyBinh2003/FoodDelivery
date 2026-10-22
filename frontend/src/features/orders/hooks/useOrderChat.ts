'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getRequiredEnv } from '@/lib/env';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: 'CUSTOMER' | 'DRIVER' | 'RESTAURANT' | 'SYSTEM' | string;
  sender_name: string;
  content: string;
  message?: string;
  message_type?: string;
  is_read?: boolean;
  is_seen?: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface QuickReplyOption {
  id: string;
  text: string;
  category: string;
}

interface UseOrderChatProps {
  orderId: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'RESTAURANT';
  enabled?: boolean;
  onNewMessage?: (msg: ChatMessage) => void;
}

const DRIVER_DEFAULT_QUICK_REPLIES: QuickReplyOption[] = [
  { id: 'd1', text: 'Dạ vâng, 3 phút nữa em đến ạ', category: 'ON_THE_WAY' },
  { id: 'd2', text: 'Tôi đã nhận món từ quán và đang trên đường giao tới', category: 'ON_THE_WAY' },
  { id: 'd3', text: 'Tôi đã tới điểm giao, mời bạn ra nhận món nhé', category: 'ARRIVED' },
  { id: 'd4', text: 'Tôi đang đứng chờ trước sảnh tòa nhà', category: 'WAITING' },
  { id: 'd5', text: 'Đoạn đường đang hơi kẹt xe, tôi sẽ tới sớm nhất có thể', category: 'TRAFFIC' },
];

const CUSTOMER_DEFAULT_QUICK_REPLIES: QuickReplyOption[] = [
  { id: 'c1', text: 'Giao trước cửa phòng giúp mình nhé!', category: 'DELIVERY' },
  { id: 'c2', text: 'Tôi đứng ở sảnh rồi ạ', category: 'LOCATION' },
  { id: 'c3', text: 'Đến nơi xin hãy gọi điện cho mình', category: 'CALL' },
  { id: 'c4', text: 'Không cần bấm chuông, bé đang ngủ', category: 'NOTE' },
];

function playNotificationSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Ignore autoplay restriction errors
  }
}

export function useOrderChat({
  orderId,
  role = 'CUSTOMER',
  enabled = true,
  onNewMessage,
}: UseOrderChatProps) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>(
    role === 'DRIVER' ? DRIVER_DEFAULT_QUICK_REPLIES : CUSTOMER_DEFAULT_QUICK_REPLIES,
  );

  const socketRef = useRef<Socket | null>(null);
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  const participantId = user?.id || (role === 'DRIVER' ? 'driver-active' : 'customer-active');
  const participantName =
    user?.name || (role === 'DRIVER' ? 'Tài xế giao hàng' : 'Khách hàng');

  useEffect(() => {
    if (!orderId || !enabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    let wsUrl: string;
    try {
      wsUrl = getRequiredEnv('NEXT_PUBLIC_DELIVERY_WS_URL');
    } catch {
      wsUrl = 'http://localhost:3005/delivery';
    }

    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join room chat cho order cụ thể (chuẩn backend NestJS ChatGateway)
      socket.emit('chat:join', {
        orderId,
        userId: participantId,
        role,
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Lắng nghe lịch sử tin nhắn khi vừa join
    socket.on(
      'chat:joined',
      (data: {
        orderId: string;
        messages: Array<Record<string, unknown>>;
        quickReplies?: QuickReplyOption[];
      }) => {
        if (data && Array.isArray(data.messages)) {
          const normalized: ChatMessage[] = data.messages.map((m) => {
            const rawContent = (m.content ?? m.message ?? '') as string;
            const isRead = Boolean(m.is_read || m.is_seen);
            return {
              id: String(m.id),
              order_id: String(m.order_id || orderId),
              sender_id: String(m.sender_id),
              sender_role: String(m.sender_role || 'CUSTOMER'),
              sender_name: String(m.sender_name || ''),
              content: rawContent,
              message: rawContent,
              message_type: String(m.message_type || 'TEXT'),
              is_read: isRead,
              is_seen: isRead,
              read_at: m.read_at ? String(m.read_at) : null,
              created_at: String(m.created_at || new Date().toISOString()),
            };
          });
          setMessages(normalized);
          const unread = normalized.filter(
            (m) => m.sender_id !== participantId && !m.is_read,
          ).length;
          setUnreadCount(unread);
        }
        if (data && Array.isArray(data.quickReplies) && data.quickReplies.length > 0) {
          setQuickReplies(data.quickReplies);
        }
      },
    );

    // Lắng nghe tin nhắn mới nhận (Backend broadcast chat:new_message)
    const handleNewMessage = (rawMsg: Record<string, unknown>) => {
      const rawContent = (rawMsg.content ?? rawMsg.message ?? '') as string;
      const isRead = Boolean(rawMsg.is_read || rawMsg.is_seen);
      const newMsg: ChatMessage = {
        id: String(rawMsg.id),
        order_id: String(rawMsg.order_id || orderId),
        sender_id: String(rawMsg.sender_id),
        sender_role: String(rawMsg.sender_role || 'CUSTOMER'),
        sender_name: String(rawMsg.sender_name || ''),
        content: rawContent,
        message: rawContent,
        message_type: String(rawMsg.message_type || 'TEXT'),
        is_read: isRead,
        is_seen: isRead,
        read_at: rawMsg.read_at ? String(rawMsg.read_at) : null,
        created_at: String(rawMsg.created_at || new Date().toISOString()),
      };

      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => m.id !== newMsg.id && !m.id.startsWith('temp-'),
        );
        return [...filtered, newMsg];
      });

      if (newMsg.sender_id !== participantId) {
        setUnreadCount((c) => c + 1);
        playNotificationSound();
        onNewMessageRef.current?.(newMsg);
      }
    };

    socket.on('chat:new_message', handleNewMessage);
    // Backward compatibility in case any service emits chat:message
    socket.on('chat:message', handleNewMessage);

    // Lắng nghe sự kiện đối phương đã xem tin nhắn
    socket.on(
      'chat:seen',
      (data: { orderId: string; readerId: string; readAt: string }) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.sender_id !== data.readerId) {
              return { ...msg, is_read: true, is_seen: true, read_at: data.readAt };
            }
            return msg;
          }),
        );
      },
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [orderId, enabled, participantId, role]);

  const sendMessage = useCallback(
    (text: string, type: 'TEXT' | 'QUICK_REPLY' = 'TEXT') => {
      const trimmed = text.trim();
      if (!trimmed || !socketRef.current) return;

      const payload = {
        order_id: orderId,
        sender_id: participantId,
        sender_role: role,
        sender_name: participantName,
        content: trimmed,
        message_type: type,
      };

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        order_id: orderId,
        sender_id: participantId,
        sender_role: role,
        sender_name: participantName,
        content: trimmed,
        message: trimmed,
        message_type: type,
        is_read: false,
        is_seen: false,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      socketRef.current.emit('chat:send', payload);
    },
    [orderId, participantId, participantName, role],
  );

  const markAsSeen = useCallback(() => {
    if (!socketRef.current || !orderId) return;
    socketRef.current.emit('chat:mark_seen', {
      orderId,
      readerId: participantId,
    });
    setUnreadCount(0);
  }, [orderId, participantId]);

  return {
    messages,
    isConnected,
    unreadCount,
    quickReplies,
    sendMessage,
    markAsSeen,
  };
}
