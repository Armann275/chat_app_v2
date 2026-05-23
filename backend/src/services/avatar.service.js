import * as userRepo from '../repositories/user.repository.js';
import { publicUser } from '../utils/mappers.js';
import { NotFoundError } from '../errors/errors.js';

export const DICEBEAR_STYLES = [
  'avataaars',
  'lorelei',
  'notionists',
  'micah',
  'personas',
  'fun-emoji',
];

const DICEBEAR_VERSION = '9.x';

export function dicebearUrl(style, seed) {
  const params = new URLSearchParams({ seed });
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/png?${params.toString()}`;
}

export async function applyGeneratedAvatar({ userId, style, seed }) {
  const url = dicebearUrl(style, seed);
  const updated = await userRepo.setGeneratedAvatar(userId, {
    avatarUrl: url,
    glbUrl: null,
  });
  if (!updated) throw new NotFoundError('User not found');
  return publicUser(updated);
}

export async function applyCustomPhoto({ userId, photoUrl }) {
  const updated = await userRepo.setCustomPhoto(userId, photoUrl);
  if (!updated) throw new NotFoundError('User not found');
  return publicUser(updated);
}

export async function removeCustomPhoto({ userId }) {
  const updated = await userRepo.clearCustomPhoto(userId);
  if (!updated) throw new NotFoundError('User not found');
  return publicUser(updated);
}
