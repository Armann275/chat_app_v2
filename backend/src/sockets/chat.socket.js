import * as chatRepo from '../repositories/chat.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import * as messageService from '../services/message.service.js';
import * as locationService from '../services/location.service.js';
import * as callService from '../services/call.service.js';
import { logger } from '../config/logger.js';

const chatRoom = (chatId) => `chat:${chatId}`;
const userRoom = (userId) => `user:${userId}`;

export function registerChatHandlers(io) {
  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    try {
      const myChats = await chatRepo.getAllChatsForUserIncludingRequests(userId, { limit: 1000, offset: 0 });
      for (const c of myChats) socket.join(chatRoom(c.id));
      socket.join(userRoom(userId));

      io.to(myChats.map((c) => chatRoom(c.id))).emit('presence:online', { userId });
    } catch (err) {
      logger.error('socket connect setup failed', { stack: err.stack });
    }

    socket.on('chat:join', async ({ chatId }) => {
      try {
        const membership = await chatRepo.getMembership(chatId, userId);
        if (!membership) return;
        socket.join(chatRoom(chatId));
      } catch (err) {
        logger.error('chat:join failed', { stack: err.stack });
      }
    });

    socket.on('message:send', async ({ chatId, content }, ack) => {
      try {
        const message = await messageService.sendMessage({
          chatId, senderId: userId, content,
        });
        if (typeof ack === 'function') ack({ ok: true, message });
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, code: err.code ?? 'INTERNAL_ERROR', message: err.message });
        }
      }
    });

    socket.on('message:seen', async ({ chatId, messageId }, ack) => {
      try {
        await messageService.markSeen(userId, chatId, messageId);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, code: err.code ?? 'INTERNAL_ERROR', message: err.message });
        }
      }
    });

    socket.on('location:update', async ({ latitude, longitude }, ack) => {
      try {
        const result = await locationService.updateLocation(
          userId,
          Number(latitude),
          Number(longitude),
        );
        if (typeof ack === 'function') ack({ ok: true, location: result });
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, code: err.code ?? 'INTERNAL_ERROR', message: err.message });
        }
      }
    });

    const relayCallSignal = async (event, payload = {}, ack) => {
      try {
        const callId = payload?.callId;
        if (!callId) {
          if (typeof ack === 'function') ack({ ok: false, code: 'VALIDATION_ERROR', message: 'callId required' });
          return;
        }
        const { callId: _omit, ...rest } = payload;
        await callService.relaySignal(userId, callId, event, rest);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, code: err.code ?? 'INTERNAL_ERROR', message: err.message });
        }
      }
    };

    socket.on('call:offer', (payload, ack) => relayCallSignal('call:offer', payload, ack));
    socket.on('call:answer', (payload, ack) => relayCallSignal('call:answer', payload, ack));
    socket.on('call:ice-candidate', (payload, ack) =>
      relayCallSignal('call:ice-candidate', payload, ack),
    );

    socket.on('typing:start', ({ chatId }) => {
      if (!chatId) return;
      socket.to(chatRoom(chatId)).emit('typing:start', { chatId, userId });
    });

    socket.on('typing:stop', ({ chatId }) => {
      if (!chatId) return;
      socket.to(chatRoom(chatId)).emit('typing:stop', { chatId, userId });
    });

    socket.on('disconnect', async () => {
      try {
        await userRepo.updateLastSeen(userId);
        const myChats = await chatRepo.getAllChatsForUserIncludingRequests(userId, { limit: 1000, offset: 0 });
        io.to(myChats.map((c) => chatRoom(c.id))).emit('presence:offline', {
          userId,
          lastSeenAt: new Date(),
        });
      } catch (err) {
        logger.error('socket disconnect cleanup failed', { stack: err.stack });
      }
    });
  });
}
