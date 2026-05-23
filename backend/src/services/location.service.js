import * as locationRepo from '../repositories/location.repository.js';
import * as friendshipRepo from '../repositories/friendship.repository.js';
import { displayAvatarUrlForRow } from '../utils/mappers.js';
import { ValidationError } from '../errors/errors.js';
import { emitToUser } from '../sockets/realtime.js';

const VALID_MODES = new Set(['nobody', 'friends', 'specific_friends']);
const DEFAULT_PRIVACY = { mode: 'nobody' };

function mapFriendLocation(row) {
  return {
    userId: row.user_id,
    username: row.username,
    displayAvatarUrl: displayAvatarUrlForRow(row),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    updatedAt: row.updated_at,
  };
}

export async function ensureDefaultPrivacy(userId) {
  const existing = await locationRepo.getPrivacy(userId);
  if (!existing) {
    await locationRepo.upsertPrivacy(userId, DEFAULT_PRIVACY.mode);
  }
}

export async function updateLocation(userId, lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new ValidationError('latitude and longitude are required');
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ValidationError('latitude/longitude out of range');
  }
  const row = await locationRepo.upsertLocation(userId, lat, lng);
  const viewers = await locationRepo.getViewersAllowedToSee(userId);

  const me = await locationRepo.getMyLocation(userId);
  const payload = {
    userId,
    latitude: Number(me.latitude),
    longitude: Number(me.longitude),
    updatedAt: me.updated_at,
  };
  for (const viewerId of viewers) {
    emitToUser(viewerId, 'friend:location', payload);
  }

  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    updatedAt: row.updated_at,
  };
}

export async function clearLocation(userId) {
  await locationRepo.deleteLocation(userId);
  const viewers = await locationRepo.getViewersAllowedToSee(userId);
  for (const viewerId of viewers) {
    emitToUser(viewerId, 'friend:location-cleared', { userId });
  }
}

export async function getPrivacy(userId) {
  const existing = await locationRepo.getPrivacy(userId);
  const mode = existing?.mode ?? DEFAULT_PRIVACY.mode;
  const visibleFriendIds = await locationRepo.listVisibleFriends(userId);
  return { mode, visibleFriendIds };
}

export async function setPrivacy(userId, { mode, visibleFriendIds }) {
  if (!VALID_MODES.has(mode)) {
    throw new ValidationError('Invalid privacy mode');
  }
  await locationRepo.upsertPrivacy(userId, mode);
  if (mode === 'specific_friends') {
    const ids = Array.isArray(visibleFriendIds) ? visibleFriendIds : [];
    await locationRepo.replaceVisibleFriends(userId, ids);
  } else {
    await locationRepo.replaceVisibleFriends(userId, []);
  }
  return getPrivacy(userId);
}

export async function getFriendsOnMap(viewerUserId) {
  const rows = await locationRepo.getVisibleFriendLocations(viewerUserId);
  return rows.map(mapFriendLocation);
}

export async function listFriendsForPrivacyPicker(userId) {
  const friends = await friendshipRepo.listFriendsOf(userId, { limit: 500, offset: 0 });
  return friends.map((f) => ({
    id: f.id,
    username: f.username,
    displayAvatarUrl: displayAvatarUrlForRow(f),
  }));
}
