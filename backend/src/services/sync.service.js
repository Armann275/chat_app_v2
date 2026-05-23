import * as syncRepo from '../repositories/sync.repository.js';
import * as messageRepo from '../repositories/message.repository.js';
import * as chatService from './chat.service.js';
import { sendMessage } from './message.service.js';
import { NotFoundError, ForbiddenError } from '../errors/errors.js';

function toMessageDto(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    content: row.content,
    replyToMessageId: row.reply_to_message_id ?? null,
    forwardedFromMessageId: row.forwarded_from_message_id ?? null,
    threadRootId: row.thread_root_id ?? null,
    editedAt: row.edited_at ?? null,
    deletedAt: row.deleted_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getDelta(currentUserId, sinceISO) {
  const since = sinceISO ? new Date(sinceISO) : new Date(0);
  if (Number.isNaN(since.getTime())) {
    throw new ForbiddenError('Invalid lastSyncedAt');
  }
  const { messages, receipts } = await syncRepo.getDeltaSince(currentUserId, since);
  return {
    serverTime: new Date().toISOString(),
    messages: messages.map(toMessageDto),
    receipts: receipts.map((r) => ({
      messageId: r.message_id,
      userId: r.user_id,
      deliveredAt: r.delivered_at ?? null,
      seenAt: r.seen_at ?? null,
    })),
  };
}

export async function setReadCursor(currentUserId, chatId, lastReadMessageId) {
  await chatService.assertMembership(chatId, currentUserId);
  if (lastReadMessageId) {
    const m = await messageRepo.getById(lastReadMessageId);
    if (!m || m.chat_id !== chatId) throw new NotFoundError('Message not in this chat');
  }
  const row = await syncRepo.upsertReadCursor({
    userId: currentUserId, chatId, lastReadMessageId,
  });
  return {
    chatId: row.chat_id,
    lastReadMessageId: row.last_read_message_id ?? null,
    lastReadAt: row.last_read_at,
  };
}

export async function getReadCursor(currentUserId, chatId) {
  await chatService.assertMembership(chatId, currentUserId);
  const row = await syncRepo.getReadCursor(currentUserId, chatId);
  if (!row) return null;
  return {
    chatId: row.chat_id,
    lastReadMessageId: row.last_read_message_id ?? null,
    lastReadAt: row.last_read_at,
  };
}

export async function processOfflineQueue(currentUserId, items) {
  const results = [];
  for (const it of items ?? []) {
    try {
      const dto = await sendMessage({
        chatId: it.chatId,
        senderId: currentUserId,
        content: it.content,
        replyToMessageId: it.replyToMessageId ?? null,
      });
      results.push({ tempId: it.tempId, ok: true, message: dto });
    } catch (err) {
      results.push({
        tempId: it.tempId, ok: false,
        code: err.code ?? 'INTERNAL_ERROR',
        error: err.message,
      });
    }
  }
  return results;
}
