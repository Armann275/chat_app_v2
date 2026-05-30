import * as blockRepo from '../repositories/block.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import { emitToUser } from '../sockets/realtime.js';
import { publicUser } from '../utils/mappers.js';
import { NotFoundError, ValidationError } from '../errors/errors.js';

export async function block(currentUserId, targetUserId) {
  if (currentUserId === targetUserId) {
    throw new ValidationError('Cannot block yourself');
  }
  const target = await userRepo.findById(targetUserId);
  if (!target) throw new NotFoundError('User not found');
  await blockRepo.block(currentUserId, targetUserId);
  emitToUser(currentUserId, 'user:blocked', { userId: targetUserId });
  return { blocked: true };
}

export async function unblock(currentUserId, targetUserId) {
  await blockRepo.unblock(currentUserId, targetUserId);
  emitToUser(currentUserId, 'user:unblocked', { userId: targetUserId });
  return { unblocked: true };
}

export async function listBlocked(currentUserId) {
  const result = await blockRepo.listBlocked(currentUserId);
  return result.map((row) => ({
    blockedAt: row.created_at,
    user: publicUser({
      id: row.blocked_id,
      username: row.username,
      email: row.email,
      avatar_url: row.avatar_url,
      bio: row.bio,
      last_seen_at: row.last_seen_at,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at,
    }),
  }));
}

export async function eitherSideBlocks(aId, bId) {
  if (aId === bId) return false;
  const row = await blockRepo.eitherSideBlocks(aId, bId);
  return Boolean(row);
}
