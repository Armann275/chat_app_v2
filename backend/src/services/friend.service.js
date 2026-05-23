import * as frRepo from '../repositories/friendRequest.repository.js';
import * as fsRepo from '../repositories/friendship.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import { emitToUser } from '../sockets/realtime.js';
import { publicUser } from '../utils/mappers.js';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../errors/errors.js';

function toRequestDto(row) {
  if (!row) return null;
  const dto = {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? null,
  };
  if (row.peer_id) {
    dto.user = publicUser({
      id: row.peer_id,
      username: row.username,
      email: row.email,
      avatar_url: row.avatar_url,
      bio: row.bio,
      last_seen_at: row.last_seen_at,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at,
    });
  }
  return dto;
}

export async function isFriend(userIdA, userIdB) {
  if (userIdA === userIdB) return false;
  return fsRepo.exists(userIdA, userIdB);
}

export async function sendRequest(currentUserId, toUserId) {
  if (currentUserId === toUserId) {
    throw new ValidationError('Cannot send a friend request to yourself');
  }
  const target = await userRepo.findById(toUserId);
  if (!target) throw new NotFoundError('User not found');

  if (await fsRepo.exists(currentUserId, toUserId)) {
    throw new ConflictError('You are already friends');
  }

  const reverse = await frRepo.findPendingBetween(toUserId, currentUserId);
  if (reverse) {
    await frRepo.setStatus(reverse.id, 'accepted');
    await fsRepo.create(currentUserId, toUserId);
    emitToUser(toUserId, 'friend:request-accepted', {
      requestId: reverse.id,
      byUserId: currentUserId,
    });
    emitToUser(currentUserId, 'friend:request-accepted', {
      requestId: reverse.id,
      byUserId: toUserId,
    });
    return { status: 'accepted', auto: true, requestId: reverse.id };
  }

  const existing = await frRepo.findPendingBetween(currentUserId, toUserId);
  if (existing) throw new ConflictError('Friend request already pending');

  const row = await frRepo.createPending(currentUserId, toUserId);
  const dto = toRequestDto({
    ...row,
    peer_id: target.id,
    username: target.username,
    email: target.email,
    avatar_url: target.avatar_url,
    bio: target.bio,
    last_seen_at: target.last_seen_at,
    user_created_at: target.created_at,
    user_updated_at: target.updated_at,
  });
  emitToUser(toUserId, 'friend:request-received', { request: dto });
  return dto;
}

export async function cancelRequest(currentUserId, requestId) {
  const row = await frRepo.findById(requestId);
  if (!row) throw new NotFoundError('Friend request not found');
  if (row.from_user_id !== currentUserId) {
    throw new ForbiddenError('Only the sender can cancel this request');
  }
  if (row.status !== 'pending') {
    throw new ConflictError('Friend request is not pending');
  }
  await frRepo.setStatus(requestId, 'cancelled');
  emitToUser(row.to_user_id, 'friend:request-cancelled', { requestId });
  return { cancelled: true };
}

export async function acceptRequest(currentUserId, requestId) {
  const row = await frRepo.findById(requestId);
  if (!row) throw new NotFoundError('Friend request not found');
  if (row.to_user_id !== currentUserId) {
    throw new ForbiddenError('Only the recipient can accept this request');
  }
  if (row.status !== 'pending') {
    throw new ConflictError('Friend request is not pending');
  }
  await frRepo.setStatus(requestId, 'accepted');
  await fsRepo.create(row.from_user_id, row.to_user_id);
  emitToUser(row.from_user_id, 'friend:request-accepted', {
    requestId,
    byUserId: currentUserId,
  });
  return { accepted: true };
}

export async function rejectRequest(currentUserId, requestId) {
  const row = await frRepo.findById(requestId);
  if (!row) throw new NotFoundError('Friend request not found');
  if (row.to_user_id !== currentUserId) {
    throw new ForbiddenError('Only the recipient can reject this request');
  }
  if (row.status !== 'pending') {
    throw new ConflictError('Friend request is not pending');
  }
  await frRepo.setStatus(requestId, 'rejected');
  emitToUser(row.from_user_id, 'friend:request-rejected', { requestId });
  return { rejected: true };
}

export async function listIncoming(currentUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await frRepo.listIncomingPending(currentUserId, { limit, offset });
  return rows.map(toRequestDto);
}

export async function listOutgoing(currentUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await frRepo.listOutgoingPending(currentUserId, { limit, offset });
  return rows.map(toRequestDto);
}

export async function listFriends(currentUserId, { limit = 100, offset = 0 } = {}) {
  const rows = await fsRepo.listFriendsOf(currentUserId, { limit, offset });
  return rows.map(publicUser);
}

export async function removeFriend(currentUserId, otherUserId) {
  if (currentUserId === otherUserId) {
    throw new ValidationError('Cannot remove yourself');
  }
  const removed = await fsRepo.remove(currentUserId, otherUserId);
  if (!removed) throw new NotFoundError('Friendship not found');
  emitToUser(otherUserId, 'friend:removed', { byUserId: currentUserId });
  return { removed: true };
}
