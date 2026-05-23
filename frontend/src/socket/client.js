import { io } from 'socket.io-client';
import { env } from '@/config/env';
import { getAccessToken } from '@/stores/authStore';

let socket = null;

export function getSocket() {
  if (socket) return socket;
  socket = io(env.socketUrl, {
    autoConnect: false,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    auth: (cb) => cb({ token: getAccessToken() }),
  });
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export function emitTyping(chatId, isTyping) {
  if (!socket?.connected) return;
  socket.emit(isTyping ? 'typing:start' : 'typing:stop', { chatId });
}
