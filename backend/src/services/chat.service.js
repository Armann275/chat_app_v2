import * as chatRepo from '../repositories/chat.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import * as privacyService from './privacy.service.js';
import * as friendService from './friend.service.js';
import { emitToChat, emitToUser } from '../sockets/realtime.js';
import { publicUser } from '../utils/mappers.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../errors/errors.js';

function toChatDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    name: row.name ?? null,
    createdBy: row.created_by,
    status: row.status ?? 'active',
    requestedByUserId: row.requested_by_user_id ?? null,
    requestTargetUserId: row.request_target_user_id ?? null,
    createdAt: row.created_at,
  };
}

function memberRowToDto(row) {
  return {
    chatId: row.chat_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
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

async function ensureMembership(chatId, userId) {
  const membership = await chatRepo.getMembership(chatId, userId);
  if (!membership) throw new ForbiddenError('Not a member of this chat');
  return membership;
}

export async function createDirectChat(currentUserId, otherUserId) {
  if (currentUserId === otherUserId) {
    throw new ValidationError('Cannot create a direct chat with yourself');
  }

  const other = await userRepo.findById(otherUserId);
  if (!other) throw new NotFoundError('Target user not found');

  const existing = await chatRepo.findDirectChatBetween(currentUserId, otherUserId);
  if (existing) return toChatDto(existing);

  const [recipientPrivacy, areFriends] = await Promise.all([
    privacyService.getEffectivePrivacy(otherUserId),
    friendService.isFriend(currentUserId, otherUserId),
  ]);

  if (recipientPrivacy === 'nobody') {
    throw new ForbiddenError('This user is not accepting messages');
  }

  let status = 'active';
  let requestedByUserId = null;
  let requestTargetUserId = null;

  if (!areFriends && recipientPrivacy === 'friends') {
    status = 'request';
    requestedByUserId = currentUserId;
    requestTargetUserId = otherUserId;
  }

  const chat = await chatRepo.createChat({
    type: 'direct',
    name: null,
    createdBy: currentUserId,
    status,
    requestedByUserId,
    requestTargetUserId,
  });
  await chatRepo.addMember({ chatId: chat.id, userId: currentUserId, role: 'member' });
  await chatRepo.addMember({ chatId: chat.id, userId: otherUserId, role: 'member' });

  const dto = toChatDto(chat);
  if (status === 'request') {
    emitToUser(otherUserId, 'chat:request-received', { chat: dto });
  }
  return dto;
}

export async function acceptChatRequest(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.status !== 'request') {
    throw new ConflictError('Chat is not a pending request');
  }
  if (chat.request_target_user_id !== currentUserId) {
    throw new ForbiddenError('Only the recipient can accept this request');
  }
  const updated = await chatRepo.setChatStatus(chatId, 'active');
  const dto = toChatDto(updated);
  emitToUser(chat.requested_by_user_id, 'chat:request-accepted', { chatId });
  emitToChat(chatId, 'chat:status-changed', { chatId, status: 'active' });
  return dto;
}

export async function rejectChatRequest(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.status !== 'request') {
    throw new ConflictError('Chat is not a pending request');
  }
  if (chat.request_target_user_id !== currentUserId) {
    throw new ForbiddenError('Only the recipient can reject this request');
  }
  const requestedBy = chat.requested_by_user_id;
  await chatRepo.deleteChat(chatId);
  if (requestedBy) {
    emitToUser(requestedBy, 'chat:request-rejected', { chatId });
  }
  return { rejected: true };
}

export async function listRequestChats(currentUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await chatRepo.getRequestChatsForUser(currentUserId, { limit, offset });
  return rows.map((row) => ({
    ...toChatDto(row),
    myRole: row.my_role,
    myJoinedAt: row.my_joined_at,
    otherUser: row.other_user_id
      ? publicUser({
        id: row.other_user_id,
        username: row.other_username,
        email: row.other_email,
        avatar_url: row.other_avatar_url,
        bio: row.other_bio,
        last_seen_at: row.other_last_seen_at,
        created_at: row.other_created_at,
        updated_at: row.other_updated_at,
      })
      : null,
  }));
}

export async function getChatForSending(chatId, senderId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  await ensureMembership(chatId, senderId);
  return chat;
}

export async function createGroupChat(currentUserId, { name, memberIds }) {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Group name is required');
  }
  const uniqueMembers = Array.from(
    new Set([currentUserId, ...(memberIds ?? [])]),
  );

  const chat = await chatRepo.createChat({
    type: 'group',
    name: name.trim(),
    createdBy: currentUserId,
  });

  for (const userId of uniqueMembers) {
    const role = userId === currentUserId ? 'admin' : 'member';
    await chatRepo.addMember({ chatId: chat.id, userId, role });
  }

  return toChatDto(chat);
}

export async function addMembers(currentUserId, chatId, userIds) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type !== 'group') {
    throw new ValidationError('Members can only be added to group chats');
  }
  await ensureMembership(chatId, currentUserId);

  for (const userId of userIds ?? []) {
    await chatRepo.addMember({ chatId, userId, role: 'member' });
  }

  const members = await chatRepo.getMembers(chatId);
  return members.map(memberRowToDto);
}

export async function removeMember(currentUserId, chatId, targetUserId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type !== 'group') {
    throw new ValidationError('Members cannot be removed from direct chats');
  }

  const myMembership = await ensureMembership(chatId, currentUserId);
  if (currentUserId !== targetUserId && myMembership.role !== 'admin') {
    throw new ForbiddenError('Only admins can remove other members');
  }

  const removed = await chatRepo.removeMember(chatId, targetUserId);
  if (removed === 0) throw new NotFoundError('Member not found in chat');
}

export async function leaveChat(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type !== 'group') {
    throw new ValidationError('You cannot leave a direct chat; delete it instead');
  }

  const removed = await chatRepo.removeMember(chatId, currentUserId);
  if (removed === 0) throw new ConflictError('Not a member of this chat');
}

export async function listMyChats(currentUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await chatRepo.getUserChats(currentUserId, { limit, offset });
  return rows.map((row) => ({
    ...toChatDto(row),
    myRole: row.my_role,
    myJoinedAt: row.my_joined_at,
    archived: row.my_archived ?? false,
    mutedUntil: row.my_muted_until ?? null,
    otherUser: row.other_user_id
      ? publicUser({
        id: row.other_user_id,
        username: row.other_username,
        email: row.other_email,
        avatar_url: row.other_avatar_url,
        bio: row.other_bio,
        last_seen_at: row.other_last_seen_at,
        created_at: row.other_created_at,
        updated_at: row.other_updated_at,
      })
      : null,
  }));
}

export async function getChat(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  await ensureMembership(chatId, currentUserId);

  const members = await chatRepo.getMembers(chatId);
  return {
    ...toChatDto(chat),
    members: members.map(memberRowToDto),
  };
}

export async function getMembers(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  await ensureMembership(chatId, currentUserId);

  const members = await chatRepo.getMembers(chatId);
  return members.map(memberRowToDto);
}

export async function assertMembership(chatId, userId) {
  return ensureMembership(chatId, userId);
}
