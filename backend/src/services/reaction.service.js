import * as reactionRepo from '../repositories/reaction.repository.js';
import * as messageRepo from '../repositories/message.repository.js';
import * as chatService from './chat.service.js';
import { emitToChat } from '../sockets/realtime.js';
import { NotFoundError, ForbiddenError } from '../errors/errors.js';

async function loadAndAuthz(currentUserId, chatId, messageId) {
  await chatService.assertMembership(chatId, currentUserId);
  const message = await messageRepo.getById(messageId);
  if (!message) throw new NotFoundError('Message not found');
  if (message.chat_id !== chatId) {
    throw new ForbiddenError('Message does not belong to this chat');
  }
  return message;
}

export async function addReaction(currentUserId, chatId, messageId, emoji) {
  await loadAndAuthz(currentUserId, chatId, messageId);
  await reactionRepo.add({ messageId, userId: currentUserId, emoji });
  emitToChat(chatId, 'reaction:added', { messageId, userId: currentUserId, emoji });
}

export async function removeReaction(currentUserId, chatId, messageId, emoji) {
  await loadAndAuthz(currentUserId, chatId, messageId);
  await reactionRepo.remove({ messageId, userId: currentUserId, emoji });
  emitToChat(chatId, 'reaction:removed', { messageId, userId: currentUserId, emoji });
}

export async function listReactions(currentUserId, chatId, messageId) {
  await loadAndAuthz(currentUserId, chatId, messageId);
  const rows = await reactionRepo.listForMessage(messageId);
  return rows.map((r) => ({
    userId: r.user_id,
    emoji: r.emoji,
    createdAt: r.created_at,
  }));
}
