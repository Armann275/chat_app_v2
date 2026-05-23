import * as userRepo from '../repositories/user.repository.js';
import { publicUser } from '../utils/mappers.js';
import { NotFoundError } from '../errors/errors.js';

export async function getProfile(userId) {
  const row = await userRepo.findById(userId);
  if (!row) throw new NotFoundError('User not found');
  return publicUser(row);
}

export async function updateProfile(userId, { avatarUrl, bio }) {
  const row = await userRepo.updateProfile(userId, { avatarUrl, bio });
  if (!row) throw new NotFoundError('User not found');
  return publicUser(row);
}

export async function searchUsers(query, { limit = 20, offset = 0 } = {}) {
  const trimmed = (query ?? '').trim();
  if (trimmed.length === 0) return [];
  const rows = await userRepo.searchByUsername(trimmed, { limit, offset });
  return rows.map(publicUser);
}
