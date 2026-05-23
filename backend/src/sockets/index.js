import { Server as SocketIOServer } from 'socket.io';
import { socketAuth } from './auth.middleware.js';
import { registerChatHandlers } from './chat.socket.js';
import { setRealtimeEmitter, setUserEmitter } from './realtime.js';
import { logger } from '../config/logger.js';

const chatRoom = (chatId) => `chat:${chatId}`;

export function initSockets(httpServer, { corsOrigin }) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use(socketAuth);
  registerChatHandlers(io);

  setRealtimeEmitter((chatId, event, payload) => {
    io.to(chatRoom(chatId)).emit(event, payload);
  });
  setUserEmitter((userId, event, payload) => {
    io.to(`user:${userId}`).emit(event, payload);
  });

  logger.info('Socket.io initialized');
  return io;
}
