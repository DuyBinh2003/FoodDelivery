'use client';

import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function AdminSocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    // Get token from cookie
    const tokenMatch = typeof document !== 'undefined'
      ? document.cookie.match(/(^|;)\s*access_token\s*=\s*([^;]+)/)
      : null;
    const token = tokenMatch ? decodeURIComponent(tokenMatch[2]) : null;

    if (!user || user.role !== 'ADMIN') return;

    const wsUrl =
      process.env.NEXT_PUBLIC_ADMIN_WS_URL ||
      process.env.NEXT_PUBLIC_WS_URL ||
      (process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL
        ? `${process.env.NEXT_PUBLIC_ADMIN_SERVICE_URL}/admin`
        : 'http://localhost:3002/admin');

    const socket = io(wsUrl, {
      auth: { token: token || undefined },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ Admin WebSocket connected to:', wsUrl, 'Socket ID:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ Admin WebSocket connect error:', error.message);
    });

    socket.on('new_registration', (data: { type?: string }) => {
      console.log('🔔 Admin received new_registration event:', data);
      toast.success(`Yêu cầu đăng ký mới: ${data?.type || 'Đối tác'}`);
      // Invalidate queries to refresh the list of pending approvals
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, queryClient]);

  return <>{children}</>;
}
