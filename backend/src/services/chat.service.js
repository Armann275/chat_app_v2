import * as chatRepo from '../repositories/chat.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import * as privacyService from './privacy.service.js';
import * as friendService from './friend.service.js';
import * as blockService from './block.service.js';
import * as systemMessageService from './systemMessage.service.js';
import { emitToChat, emitToUser, joinUserToChat } from '../sockets/realtime.js';
import { publicUser } from '../utils/mappers.js';
import {
  ROLES,
  canEditChat,
  canManageMembers,
  canManageRoles,
  rankOf,
} from '../utils/chatPermissions.js';
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
    description: row.description ?? null,
    joinMode: row.join_mode ?? 'invite_only',
    disappearingSeconds: row.disappearing_seconds ?? null,
    createdBy: row.created_by,
    status: row.status ?? 'active',
    requestedByUserId: row.requested_by_user_id ?? null,
    requestTargetUserId: row.request_target_user_id ?? null,
    createdAt: row.created_at,
  };
}

const MAX_DISAPPEARING_SECONDS = 60 * 60 * 24 * 365;

async function usernameOf(userId) {
  const user = await userRepo.findById(userId);
  return user?.username ?? 'Someone';
}

function normalizeDisappearingSeconds(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ValidationError('disappearingSeconds must be a number or null');
  }
  const n = Math.trunc(value);
  if (n <= 0) return null;
  if (n > MAX_DISAPPEARING_SECONDS) {
    throw new ValidationError(
      `disappearingSeconds must be <= ${MAX_DISAPPEARING_SECONDS}`,
    );
  }
  return n;
}

export async function setDisappearing(currentUserId, chatId, disappearingSeconds) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');

  const myMembership = await ensureMembership(chatId, currentUserId);

  if (chat.type !== 'direct' && !canEditChat(myMembership.role)) {
    throw new ForbiddenError('Only admins can change disappearing messages');
  }

  const normalized = normalizeDisappearingSeconds(disappearingSeconds);
  const updated = await chatRepo.setDisappearingSeconds(chatId, normalized);
  const dto = toChatDto(updated);
  emitToChat(chatId, 'chat:disappearing-updated', {
    chatId,
    disappearingSeconds: normalized,
  });
  return dto;
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

  if (await blockService.eitherSideBlocks(currentUserId, otherUserId)) {
    throw new ForbiddenError('Cannot start a chat with a blocked user');
  }

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

  // Join both participants' live sockets to the new chat room so messages/calls
  // flow immediately, without waiting for a reconnect.
  joinUserToChat(currentUserId, chat.id);
  joinUserToChat(otherUserId, chat.id);

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

  // Ensure both participants' sockets are in the room before broadcasting, so the
  // now-active chat works immediately for messaging and calls without a refresh.
  if (chat.requested_by_user_id) joinUserToChat(chat.requested_by_user_id, chatId);
  joinUserToChat(currentUserId, chatId);

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

export async function createChannel(currentUserId, { name, description, memberIds = [] }) {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Channel name is required');
  }
  const uniqueMembers = Array.from(new Set([currentUserId, ...memberIds]));

  const chat = await chatRepo.createChat({
    type: 'channel',
    name: name.trim(),
    description: description?.trim() || null,
    createdBy: currentUserId,
  });

  for (const userId of uniqueMembers) {
    const role = userId === currentUserId ? ROLES.ADMIN : ROLES.MEMBER;
    await chatRepo.addMember({ chatId: chat.id, userId, role });
    joinUserToChat(userId, chat.id);
  }

  await systemMessageService.createSystemMessage(chat.id, {
    event: 'channel_created',
    actorId: currentUserId,
    actorUsername: await usernameOf(currentUserId),
  });

  return toChatDto(chat);
}

export async function createGroupChat(currentUserId, { name, memberIds, description }) {
  if (!name || name.trim().length === 0) {
    throw new ValidationError('Group name is required');
  }
  const uniqueMembers = Array.from(
    new Set([currentUserId, ...(memberIds ?? [])]),
  );

  const chat = await chatRepo.createChat({
    type: 'group',
    name: name.trim(),
    description: description?.trim() || null,
    createdBy: currentUserId,
  });

  for (const userId of uniqueMembers) {
    const role = userId === currentUserId ? ROLES.ADMIN : ROLES.MEMBER;
    await chatRepo.addMember({ chatId: chat.id, userId, role });
    joinUserToChat(userId, chat.id);
  }

  await systemMessageService.createSystemMessage(chat.id, {
    event: 'group_created',
    actorId: currentUserId,
    actorUsername: await usernameOf(currentUserId),
  });

  return toChatDto(chat);
}

export async function updateGroupInfo(currentUserId, chatId, { name, description }) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type === 'direct') {
    throw new ValidationError('Direct chats cannot be edited');
  }

  const myMembership = await ensureMembership(chatId, currentUserId);
  if (!canEditChat(myMembership.role)) {
    throw new ForbiddenError('Only admins can edit chat info');
  }

  const cleanName =
    typeof name === 'string' ? name.trim() : undefined;
  if (cleanName !== undefined && cleanName.length === 0) {
    throw new ValidationError('Group name cannot be empty');
  }
  const cleanDescription =
    typeof description === 'string' ? description.trim() : undefined;

  const updated = await chatRepo.updateChatInfo(chatId, {
    name: cleanName,
    description: cleanDescription,
  });
  const dto = toChatDto(updated);
  emitToChat(chatId, 'chat:updated', { chat: dto });

  if (cleanName !== undefined && cleanName !== chat.name) {
    await systemMessageService.createSystemMessage(chatId, {
      event: 'group_renamed',
      actorId: currentUserId,
      actorUsername: await usernameOf(currentUserId),
      name: cleanName,
    });
  }
  return dto;
}

export async function setMemberRole(currentUserId, chatId, targetUserId, newRole) {
  if (!Object.values(ROLES).includes(newRole)) {
    throw new ValidationError(
      `role must be one of: ${Object.values(ROLES).join(', ')}`,
    );
  }

  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type === 'direct') {
    throw new ValidationError('Direct chats have no roles');
  }

  const myMembership = await ensureMembership(chatId, currentUserId);
  if (!canManageRoles(myMembership.role)) {
    throw new ForbiddenError('Only admins can change member roles');
  }

  const targetMembership = await chatRepo.getMembership(chatId, targetUserId);
  if (!targetMembership) throw new NotFoundError('Member not found in chat');

  if (targetMembership.role === newRole) {
    return memberRowToDto({
      ...(await chatRepo.getMembers(chatId)).find(
        (m) => m.user_id === targetUserId,
      ),
    });
  }

  // Can't demote yourself if you're the last admin; can't demote another last admin.
  if (
    targetMembership.role === ROLES.ADMIN &&
    rankOf(newRole) < rankOf(ROLES.ADMIN)
  ) {
    const admins = await chatRepo.countAdmins(chatId);
    if (admins <= 1) {
      throw new ConflictError('Cannot demote the last admin');
    }
  }

  await chatRepo.setMemberRole(chatId, targetUserId, newRole);
  const members = await chatRepo.getMembers(chatId);
  const updated = members.find((m) => m.user_id === targetUserId);
  const dto = memberRowToDto(updated);
  emitToChat(chatId, 'chat:member-role-changed', {
    chatId,
    userId: targetUserId,
    role: newRole,
  });

  await systemMessageService.createSystemMessage(chatId, {
    event: 'role_changed',
    actorId: currentUserId,
    actorUsername: await usernameOf(currentUserId),
    targetId: targetUserId,
    targetUsername: await usernameOf(targetUserId),
    role: newRole,
  });
  return dto;
}

export async function addMembers(currentUserId, chatId, userIds) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type !== 'group') {
    throw new ValidationError('Members can only be added to group chats');
  }
  await ensureMembership(chatId, currentUserId);

  const actorUsername = await usernameOf(currentUserId);
  for (const userId of userIds ?? []) {
    await chatRepo.addMember({ chatId, userId, role: 'member' });
    joinUserToChat(userId, chatId);
    await systemMessageService.createSystemMessage(chatId, {
      event: 'member_added',
      actorId: currentUserId,
      actorUsername,
      targetId: userId,
      targetUsername: await usernameOf(userId),
    });
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
  if (currentUserId !== targetUserId && !canManageMembers(myMembership.role)) {
    throw new ForbiddenError('Only admins can remove other members');
  }

  if (currentUserId === targetUserId && myMembership.role === ROLES.ADMIN) {
    const admins = await chatRepo.countAdmins(chatId);
    if (admins <= 1) {
      throw new ConflictError(
        'Last admin cannot leave; promote another admin first',
      );
    }
  }

  const removed = await chatRepo.removeMember(chatId, targetUserId);
  if (removed === 0) throw new NotFoundError('Member not found in chat');

  if (currentUserId === targetUserId) {
    await systemMessageService.createSystemMessage(chatId, {
      event: 'member_left',
      actorId: currentUserId,
      actorUsername: await usernameOf(currentUserId),
    });
  } else {
    await systemMessageService.createSystemMessage(chatId, {
      event: 'member_removed',
      actorId: currentUserId,
      actorUsername: await usernameOf(currentUserId),
      targetId: targetUserId,
      targetUsername: await usernameOf(targetUserId),
    });
  }
}

export async function leaveChat(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type === 'direct') {
    throw new ValidationError('You cannot leave a direct chat; delete it instead');
  }

  const myMembership = await chatRepo.getMembership(chatId, currentUserId);
  if (myMembership?.role === ROLES.ADMIN) {
    const admins = await chatRepo.countAdmins(chatId);
    if (admins <= 1) {
      throw new ConflictError(
        'Last admin cannot leave; promote another admin first',
      );
    }
  }

  const removed = await chatRepo.removeMember(chatId, currentUserId);
  if (removed === 0) throw new ConflictError('Not a member of this chat');

  await systemMessageService.createSystemMessage(chatId, {
    event: 'member_left',
    actorId: currentUserId,
    actorUsername: await usernameOf(currentUserId),
  });
}

export async function deleteDirectChat(currentUserId, chatId, mode = 'for_me') {
  if (mode !== 'for_me' && mode !== 'for_everyone') {
    throw new ValidationError("mode must be 'for_me' or 'for_everyone'");
  }

  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type !== 'direct') {
    throw new ValidationError('Only direct chats can be deleted');
  }
  await ensureMembership(chatId, currentUserId);

  if (mode === 'for_everyone') {
    // Remove the conversation for both participants. Capture members first so we
    // can notify the other side before the rows (and chat room) are gone.
    const members = await chatRepo.getMembers(chatId);
    await chatRepo.deleteChat(chatId); // cascades messages, members, prefs, clears
    for (const member of members) {
      if (member.user_id !== currentUserId) {
        emitToUser(member.user_id, 'chat:deleted', { chatId, mode: 'for_everyone' });
      }
    }
    return { deleted: true, mode };
  }

  // for_me: hide the conversation only for the current user.
  await chatRepo.clearChatForUser(chatId, currentUserId);
  return { deleted: true, mode };
}

function toLastMessageDto(row) {
  if (!row.last_message_id) return null;
  return {
    id: row.last_message_id,
    senderId: row.last_message_sender_id,
    senderUsername: row.last_message_sender_username ?? null,
    content: row.last_message_content ?? '',
    createdAt: row.last_message_at,
    deletedAt: row.last_message_deleted_at ?? null,
    attachmentKind: row.last_message_attachment_kind ?? null,
  };
}

export async function listMyChats(currentUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await chatRepo.getUserChats(currentUserId, { limit, offset });
  return rows.map((row) => ({
    ...toChatDto(row),
    myRole: row.my_role,
    myJoinedAt: row.my_joined_at,
    archived: row.my_archived ?? false,
    mutedUntil: row.my_muted_until ?? null,
    lastMessage: toLastMessageDto(row),
    lastMessageAt: row.last_message_at ?? null,
    unreadCount: row.unread_count ?? 0,
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
