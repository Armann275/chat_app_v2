import * as joinRepo from '../repositories/joinRequest.repository.js';
import * as chatRepo from '../repositories/chat.repository.js';
import { emitToChat, emitToUser, joinUserToChat } from '../sockets/realtime.js';
import { canManageMembers } from '../utils/chatPermissions.js';
import { publicUser } from '../utils/mappers.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../errors/errors.js';

function toDto(row) {
  if (!row) return null;
  return {
    chatId: row.chat_id,
    userId: row.user_id,
    status: row.status,
    message: row.message ?? null,
    requestedAt: row.requested_at,
    decidedBy: row.decided_by ?? null,
    decidedAt: row.decided_at ?? null,
  };
}

function pendingRowToDto(row) {
  return {
    ...toDto(row),
    user: publicUser({
      id: row.user_id,
      username: row.username,
      email: row.email,
      avatar_url: row.avatar_url,
      bio: row.bio,
      last_seen_at: row.last_seen_at,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at,
    }),
  };
}

export async function request(currentUserId, chatId, { message = null } = {}) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type === 'direct') {
    throw new ValidationError('Direct chats do not accept join requests');
  }
  if (chat.join_mode === 'closed' || chat.join_mode === 'invite_only') {
    throw new ForbiddenError('This chat is invite-only');
  }

  const existing = await chatRepo.getMembership(chatId, currentUserId);
  if (existing) throw new ConflictError('Already a member');

  if (chat.join_mode === 'open') {
    await chatRepo.addMember({ chatId, userId: currentUserId, role: 'member' });
    joinUserToChat(currentUserId, chatId);
    emitToChat(chatId, 'chat:member-added', {
      chatId, userId: currentUserId, via: 'open-join',
    });
    emitToUser(currentUserId, 'chat:joined', { chatId });
    return { chatId, joined: true };
  }

  const trimmedMessage =
    typeof message === 'string' && message.trim().length > 0
      ? message.trim().slice(0, 500)
      : null;
  const row = await joinRepo.upsertPending({
    chatId, userId: currentUserId, message: trimmedMessage,
  });
  emitToChat(chatId, 'chat:join-request', {
    chatId, userId: currentUserId, message: trimmedMessage,
  });
  return toDto(row);
}

export async function listPending(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  const membership = await chatRepo.getMembership(chatId, currentUserId);
  if (!membership) throw new ForbiddenError('Not a member of this chat');
  if (!canManageMembers(membership.role)) {
    throw new ForbiddenError('Only admins can view join requests');
  }
  const result = await joinRepo.listPending(chatId);
  return result.map(pendingRowToDto);
}

async function decide(currentUserId, chatId, userId, decision) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  const membership = await chatRepo.getMembership(chatId, currentUserId);
  if (!membership) throw new ForbiddenError('Not a member of this chat');
  if (!canManageMembers(membership.role)) {
    throw new ForbiddenError('Only admins can decide join requests');
  }

  const existing = await joinRepo.find(chatId, userId);
  if (!existing || existing.status !== 'pending') {
    throw new NotFoundError('Pending join request not found');
  }

  const updated = await joinRepo.decide({
    chatId, userId, status: decision, decidedBy: currentUserId,
  });

  if (decision === 'approved') {
    await chatRepo.addMember({ chatId, userId, role: 'member' });
    joinUserToChat(userId, chatId);
    emitToChat(chatId, 'chat:member-added', {
      chatId, userId, via: 'join-request',
    });
    emitToUser(userId, 'chat:join-approved', { chatId });
  } else {
    emitToUser(userId, 'chat:join-rejected', { chatId });
  }

  return toDto(updated);
}

export async function approve(currentUserId, chatId, userId) {
  return decide(currentUserId, chatId, userId, 'approved');
}

export async function reject(currentUserId, chatId, userId) {
  return decide(currentUserId, chatId, userId, 'rejected');
}
