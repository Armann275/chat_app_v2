import * as userRepo from '../repositories/user.repository.js';
import { publicUser } from '../utils/mappers.js';
import { NotFoundError, ConflictError } from '../errors/errors.js';

export async function getProfile(userId) {
  const row = await userRepo.findById(userId);
  if (!row) throw new NotFoundError('User not found');
  return publicUser(row);
}

export async function updateProfile(userId, { username, avatarUrl, bio }) {
  let cleanUsername;
  if (username !== undefined) {
    cleanUsername = username.trim();
    const existing = await userRepo.findByUsername(cleanUsername);
    if (existing && existing.id !== userId) {
      throw new ConflictError('Username already taken');
    }
  }

  let row;
  try {
    row = await userRepo.updateProfile(userId, {
      username: cleanUsername,
      avatarUrl,
      bio,
    });
  } catch (err) {
    // Guard against a race between the check above and the update.
    if (err?.code === '23505') {
      throw new ConflictError('Username already taken');
    }
    throw err;
  }
  if (!row) throw new NotFoundError('User not found');
  return publicUser(row);
}

export async function searchUsers(query, { limit = 20, offset = 0 } = {}) {
  const trimmed = (query ?? '').trim();
  if (trimmed.length === 0) return [];
  const rows = await userRepo.searchByUsername(trimmed, { limit, offset });
  return rows.map(publicUser);
}
