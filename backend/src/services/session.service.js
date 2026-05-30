import * as refreshRepo from '../repositories/refreshToken.repository.js';
import { hashRefreshToken } from '../utils/jwt.js';
import { NotFoundError, ForbiddenError } from '../errors/errors.js';

function toDto(row, currentSessionId) {
  return {
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at ?? null,
    userAgent: row.user_agent ?? null,
    ip: row.ip ?? null,
    current: row.id === currentSessionId,
  };
}

async function resolveCurrentSessionId(rawRefreshToken) {
  if (!rawRefreshToken) return null;
  const stored = await refreshRepo.findByHash(hashRefreshToken(rawRefreshToken));
  return stored?.id ?? null;
}

export async function listMine(userId, rawRefreshToken) {
  const currentId = await resolveCurrentSessionId(rawRefreshToken);
  const rows = await refreshRepo.listActiveForUser(userId);
  return rows.map((row) => toDto(row, currentId));
}

export async function revoke(userId, sessionId) {
  const row = await refreshRepo.findById(sessionId);
  if (!row) throw new NotFoundError('Session not found');
  if (row.user_id !== userId) {
    throw new ForbiddenError('Cannot revoke another user\'s session');
  }
  if (!row.revoked_at) {
    await refreshRepo.revoke(sessionId);
  }
  return { revoked: true };
}

export async function revokeOthers(userId, rawRefreshToken) {
  const currentId = await resolveCurrentSessionId(rawRefreshToken);
  if (!currentId) {
    throw new ForbiddenError('No current session to keep');
  }
  await refreshRepo.revokeAllExceptId(userId, currentId);
  return { revoked: true };
}
