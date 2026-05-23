import * as starRepo from '../repositories/star.repository.js';
import * as messageRepo from '../repositories/message.repository.js';
import * as chatService from './chat.service.js';
import { NotFoundError, ForbiddenError } from '../errors/errors.js';

function starredRowToDto(row) {
  return {
    starredAt: row.starred_at,
    message: {
      id: row.id,
      chatId: row.chat_id,
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

async function loadAndAuthz(currentUserId, messageId) {
  const message = await messageRepo.getById(messageId);
  if (!message) throw new NotFoundError('Message not found');
  await chatService.assertMembership(message.chat_id, currentUserId).catch(() => {
    throw new ForbiddenError('You are not a member of that chat');
  });
  return message;
}

export async function star(currentUserId, messageId) {
  await loadAndAuthz(currentUserId, messageId);
  await starRepo.star({ userId: currentUserId, messageId });
}

export async function unstar(currentUserId, messageId) {
  await starRepo.unstar({ userId: currentUserId, messageId });
}

export async function listStarred(currentUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await starRepo.listForUser(currentUserId, { limit, offset });
  return rows.map(starredRowToDto);
}
