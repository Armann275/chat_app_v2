import * as messageRepo from '../repositories/message.repository.js';
import * as receiptRepo from '../repositories/messageReceipt.repository.js';
import * as mentionRepo from '../repositories/mention.repository.js';
import * as chatRepo from '../repositories/chat.repository.js';
import * as linkPreviewService from './linkPreview.service.js';
import * as attachmentService from './attachment.service.js';
import * as chatService from './chat.service.js';
import { emitToChat, emitToUser } from '../sockets/realtime.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors/errors.js';

const MENTION_RE = /@([a-zA-Z0-9_]{3,32})/g;

async function resolveMentionsFor(chatId, content) {
  const usernames = Array.from(new Set(
    [...content.matchAll(MENTION_RE)].map((m) => m[1]),
  ));
  if (usernames.length === 0) return [];

  const memberRows = await chatRepo.getMembers(chatId);
  const memberByUsername = new Map(memberRows.map((m) => [m.username, m.user_id]));
  return usernames
    .map((u) => memberByUsername.get(u))
    .filter(Boolean);
}

function toMessageDto(row) {
  if (!row) return null;
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
    reactions: row.reactions ?? [],
    attachments: row.attachments ?? [],
  };
}

export async function sendMessage({
  chatId, senderId, content,
  replyToMessageId = null, forwardedFromMessageId = null, asThreadReply = false,
  attachmentIds = [],
}) {
  const chat = await chatService.getChatForSending(chatId, senderId);
  if (chat.status === 'request' && chat.requested_by_user_id !== senderId) {
    throw new ForbiddenError('Accept this chat request before replying');
  }

  let threadRootId = null;
  if (replyToMessageId) {
    const target = await messageRepo.getById(replyToMessageId);
    if (!target || target.chat_id !== chatId) {
      throw new ForbiddenError('Cannot reply to a message outside this chat');
    }
    if (asThreadReply || target.thread_root_id) {
      threadRootId = target.thread_root_id ?? target.id;
      if (!target.thread_root_id) {
        await messageRepo.setThreadRoot(target.id, target.id);
      }
    }
  }

  const row = await messageRepo.create({
    chatId, senderId, content, replyToMessageId, forwardedFromMessageId, threadRootId,
  });
  const dto = toMessageDto(row);

  if (attachmentIds.length) {
    dto.attachments = await attachmentService.attachToMessage(row.id, attachmentIds, senderId);
  }

  const mentionedUserIds = await resolveMentionsFor(chatId, content);
  if (mentionedUserIds.length) {
    await mentionRepo.createMentions(row.id, mentionedUserIds);
    for (const uid of mentionedUserIds) {
      emitToUser(uid, 'message:mentioned', { chatId, messageId: row.id, byUserId: senderId });
    }
  }

  emitToChat(chatId, 'message:new', dto);
  if (threadRootId) {
    emitToChat(chatId, 'thread:reply', { threadRootId, message: dto });
  }
  linkPreviewService.enqueueForMessage({ chatId, messageId: row.id, content }).catch(() => {});
  return dto;
}

export async function getThreadMessages(currentUserId, chatId, rootId, { limit = 50, offset = 0 } = {}) {
  await chatService.assertMembership(chatId, currentUserId);
  const root = await messageRepo.getById(rootId);
  if (!root || root.chat_id !== chatId) {
    throw new NotFoundError('Thread root not found in this chat');
  }
  const rows = await messageRepo.getThreadMessages(rootId, { limit, offset });
  return { root: toMessageDto(root), messages: rows.map(toMessageDto) };
}

export async function forwardMessages(currentUserId, { messageIds, toChatIds }) {
  const sources = [];
  for (const id of messageIds ?? []) {
    const m = await messageRepo.getById(id);
    if (!m) throw new NotFoundError('Source message not found');
    if (m.deleted_at) throw new ForbiddenError('Cannot forward a deleted message');
    await chatService.assertMembership(m.chat_id, currentUserId);
    sources.push(m);
  }

  const results = [];
  for (const targetChatId of toChatIds ?? []) {
    await chatService.assertMembership(targetChatId, currentUserId);
    for (const src of sources) {
      const dto = await sendMessage({
        chatId: targetChatId,
        senderId: currentUserId,
        content: src.content,
        forwardedFromMessageId: src.id,
      });
      results.push(dto);
    }
  }
  return results;
}

export async function getMessages(currentUserId, chatId, { limit = 50, offset = 0 } = {}) {
  await chatService.assertMembership(chatId, currentUserId);
  const rows = await messageRepo.getByChat(chatId, currentUserId, { limit, offset });
  return rows.map(toMessageDto);
}

export async function editMessage(currentUserId, chatId, messageId, content) {
  await chatService.assertMembership(chatId, currentUserId);
  const existing = await messageRepo.getById(messageId);
  if (!existing) throw new NotFoundError('Message not found');
  if (existing.chat_id !== chatId) {
    throw new ForbiddenError('Message does not belong to this chat');
  }
  if (existing.sender_id !== currentUserId) {
    throw new ForbiddenError('Only the sender can edit this message');
  }
  if (existing.deleted_at) {
    throw new ConflictError('Cannot edit a deleted message');
  }
  const updated = await messageRepo.editMessage(messageId, content);
  const dto = toMessageDto(updated);
  emitToChat(chatId, 'message:edited', dto);
  return dto;
}

export async function deleteMessage(currentUserId, chatId, messageId, mode) {
  await chatService.assertMembership(chatId, currentUserId);
  const existing = await messageRepo.getById(messageId);
  if (!existing) throw new NotFoundError('Message not found');
  if (existing.chat_id !== chatId) {
    throw new ForbiddenError('Message does not belong to this chat');
  }

  if (mode === 'for_everyone') {
    if (existing.sender_id !== currentUserId) {
      throw new ForbiddenError('Only the sender can delete for everyone');
    }
    if (existing.deleted_at) return toMessageDto(existing);
    const updated = await messageRepo.softDeleteForEveryone(messageId);
    const dto = toMessageDto(updated);
    emitToChat(chatId, 'message:deleted', { id: messageId, mode: 'for_everyone', deletedAt: dto.deletedAt });
    return dto;
  }

  await messageRepo.hideForUser(messageId, currentUserId);
  return { id: messageId, hiddenForUser: true };
}

export async function markSeen(currentUserId, chatId, messageId) {
  await chatService.assertMembership(chatId, currentUserId);

  const message = await messageRepo.getById(messageId);
  if (!message) throw new NotFoundError('Message not found');
  if (message.chat_id !== chatId) {
    throw new ForbiddenError('Message does not belong to this chat');
  }

  await receiptRepo.markSeen({ messageId, userId: currentUserId });

  emitToChat(chatId, 'message:seen', {
    messageId,
    userId: currentUserId,
    seenAt: new Date(),
  });
}

export async function searchMessages(currentUserId, { q, chatId, limit = 50, offset = 0 }) {
  if (chatId) {
    await chatService.assertMembership(chatId, currentUserId);
    const rows = await messageRepo.searchInChat(chatId, currentUserId, q, { limit, offset });
    return rows.map(toMessageDto);
  }
  const rows = await messageRepo.searchAll(currentUserId, q, { limit, offset });
  return rows.map(toMessageDto);
}

export async function getUnreadCounts(currentUserId) {
  const rows = await receiptRepo.getUnreadCountsForUser(currentUserId);
  return rows.map((r) => ({ chatId: r.chat_id, unread: r.unread }));
}
