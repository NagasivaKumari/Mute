'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../lib/api-client';

let socket: Socket | null = null;

export function useWebSocket(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const token = localStorage.getItem('sentinel_access_token');
    if (!token) return;

    const baseUrl = API_URL.replace(/\/v1\/?$/, '');
    socket = io(baseUrl, { path: '/ws', query: { token }, transports: ['websocket'] });

    socket.on('approval:created', () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    });
    socket.on('approval:resolved', () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    });
    socket.on('audit:created', () => {
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [enabled, queryClient]);
}
