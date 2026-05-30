import * as pinRepo from '../repositories/pin.repository.js';
import * as messageRepo from '../repositories/message.repository.js';
import * as chatRepo from '../repositories/chat.repository.js';
import * as chatService from './chat.service.js';
import { emitToChat } from '../sockets/realtime.js';
import { canPin } from '../utils/chatPermissions.js';
import { NotFoundError, ForbiddenError } from '../errors/errors.js';

function pinnedRowToDto(row) {
  return {
    chatId: row.chat_id,
    messageId: row.message_id,
    pinnedBy: row.pinned_by,
    pinnedAt: row.pinned_at,
    message: {
      id: row.id,
      chatId: row.m_chat_id,
      senderId: row.sender_id,
      content: row.content,
      replyToMessageId: row.reply_to_message_id ?? null,
      editedAt: row.edited_at ?? null,
      deletedAt: row.deleted_at ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

async function loadAndAuthz(currentUserId, chatId, messageId, { requirePinRole = false } = {}) {
  const membership = await chatService.assertMembership(chatId, currentUserId);
  const chat = await chatRepo.getChatById(chatId);
  if (requirePinRole && chat?.type !== 'direct' && !canPin(membership.role)) {
    throw new ForbiddenError('Only moderators or admins can pin messages');
  }
  const message = await messageRepo.getById(messageId);
  if (!message) throw new NotFoundError('Message not found');
  if (message.chat_id !== chatId) {
    throw new ForbiddenError('Message does not belong to this chat');
  }
  return message;
}

export async function pin(currentUserId, chatId, messageId) {
  await loadAndAuthz(currentUserId, chatId, messageId, { requirePinRole: true });
  await pinRepo.pin({ chatId, messageId, pinnedBy: currentUserId });
  emitToChat(chatId, 'message:pinned', { chatId, messageId, pinnedBy: currentUserId });
}

export async function unpin(currentUserId, chatId, messageId) {
  await loadAndAuthz(currentUserId, chatId, messageId, { requirePinRole: true });
  await pinRepo.unpin({ chatId, messageId });
  emitToChat(chatId, 'message:unpinned', { chatId, messageId });
}

export async function listPins(currentUserId, chatId) {
  await chatService.assertMembership(chatId, currentUserId);
  const rows = await pinRepo.listForChat(chatId);
  return rows.map(pinnedRowToDto);
}
