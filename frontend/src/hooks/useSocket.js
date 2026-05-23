import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { connectSocket, disconnectSocket, getSocket } from '@/socket/client';
import {
  registerSocketHandlers,
  unregisterSocketHandlers,
} from '@/socket/handlers';

export function useSocket() {
  const status = useAuthStore((s) => s.status);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const setStatus = useSocketStore((s) => s.setStatus);
  const reset = useSocketStore((s) => s.reset);

  useEffect(() => {
    if (status !== 'authed' || !accessToken) return undefined;

    const socket = getSocket();
    registerSocketHandlers(socket, queryClient);
    setStatus('connecting');
    connectSocket();

    return () => {
      unregisterSocketHandlers(socket);
      disconnectSocket();
      reset();
    };
  }, [status, accessToken, queryClient, setStatus, reset]);
}
