'use client';

import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function AdminSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!user || user.role !== 'ADMIN' || !token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001/admin', {
      auth: { token }
    });

    socket.on('new_registration', (data) => {
      toast.success(`Yêu cầu đăng ký mới: ${data.type}`);
      // Invalidate queries to refresh the list of pending approvals
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] });
    });

    socket.on('connect', () => {
      console.log('Admin WebSocket connected.');
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token, queryClient]);

  return <>{children}</>;
}
