'use client';

import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface RegistrationResultEvent {
  id: string;
  type: 'RESTAURANT' | 'DRIVER';
  status: 'APPROVED' | 'REJECTED';
  message?: string | null;
  name: string;
}

export function UserSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;

    const wsUrl = process.env.NEXT_PUBLIC_USER_WS_URL || 'http://localhost:3001/user';

    const socket = io(wsUrl, {
      query: { userId: user.id },
      auth: { userId: user.id },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ User WebSocket connected to:', wsUrl, 'Socket ID:', socket.id);
    });

    socket.on('registration_result', (data: RegistrationResultEvent) => {
      console.log('🔔 Received registration_result event:', data);

      if (data.status === 'APPROVED') {
        toast.success(
          () => (
            <div className="flex flex-col gap-1 py-1">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span>🎉</span> Hồ sơ đã được phê duyệt!
              </div>
              <div className="text-xs text-zinc-300">
                Yêu cầu {data.type === 'RESTAURANT' ? 'mở nhà hàng' : 'đăng ký tài xế'}{' '}
                <strong className="text-white">&ldquo;{data.name}&rdquo;</strong> đã được Admin chấp thuận thành công.
              </div>
              {data.message && (
                <div className="text-xs text-zinc-300 mt-1 bg-zinc-900/90 p-2 rounded-lg border border-zinc-800">
                  <span className="font-medium text-emerald-400">Lời nhắn:</span> &ldquo;{data.message}&rdquo;
                </div>
              )}
            </div>
          ),
          { duration: 8000 }
        );
      } else {
        toast.error(
          () => (
            <div className="flex flex-col gap-1 py-1">
              <div className="font-semibold text-red-400 flex items-center gap-1.5">
                <span>❌</span> Hồ sơ đã bị từ chối
              </div>
              <div className="text-xs text-zinc-300">
                Yêu cầu {data.type === 'RESTAURANT' ? 'mở nhà hàng' : 'đăng ký tài xế'}{' '}
                <strong className="text-white">&ldquo;{data.name}&rdquo;</strong> chưa được thông qua.
              </div>
              {data.message && (
                <div className="text-xs text-red-300 mt-1 bg-red-950/40 p-2 rounded-lg border border-red-800/40">
                  <span className="font-medium text-red-400">Lý do từ chối:</span> {data.message}
                </div>
              )}
            </div>
          ),
          { duration: 10000 }
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  return <>{children}</>;
}
