import * as repo from '../repositories/privacySettings.repository.js';
import { emitToUser } from '../sockets/realtime.js';
import { ValidationError } from '../errors/errors.js';

const ALLOWED_MODES = new Set(['everyone', 'friends', 'nobody']);
const DEFAULT_SETTINGS = Object.freeze({
  whoCanMessage: 'everyone',
  lastSeenVisibility: 'everyone',
  profilePhotoVisibility: 'everyone',
  updatedAt: null,
});

function toDto(row) {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    whoCanMessage: row.who_can_message ?? 'everyone',
    lastSeenVisibility: row.last_seen_visibility ?? 'everyone',
    profilePhotoVisibility: row.profile_photo_visibility ?? 'everyone',
    updatedAt: row.updated_at ?? null,
  };
}

export async function getMine(userId) {
  const row = await repo.getByUserId(userId);
  return toDto(row);
}

export async function getEffectivePrivacy(userId) {
  const row = await repo.getByUserId(userId);
  return row?.who_can_message ?? 'everyone';
}

export async function getSettings(userId) {
  const row = await repo.getByUserId(userId);
  return toDto(row);
}

function validateMode(name, value) {
  if (value === undefined) return undefined;
  if (!ALLOWED_MODES.has(value)) {
    throw new ValidationError(
      `${name} must be one of: everyone, friends, nobody`,
    );
  }
  return value;
}

export async function updateMine(userId, fields) {
  // Back-compat: accept a bare string for whoCanMessage.
  const incoming = typeof fields === 'string' ? { whoCanMessage: fields } : (fields ?? {});

  const whoCanMessage = validateMode('whoCanMessage', incoming.whoCanMessage);
  const lastSeenVisibility = validateMode('lastSeenVisibility', incoming.lastSeenVisibility);
  const profilePhotoVisibility = validateMode(
    'profilePhotoVisibility',
    incoming.profilePhotoVisibility,
  );

  if (
    whoCanMessage === undefined &&
    lastSeenVisibility === undefined &&
    profilePhotoVisibility === undefined
  ) {
    throw new ValidationError('No privacy fields provided');
  }

  const row = await repo.upsert(userId, {
    whoCanMessage,
    lastSeenVisibility,
    profilePhotoVisibility,
  });
  const dto = toDto(row);
  emitToUser(userId, 'privacy:updated', dto);
  return dto;
}

export function applyPrivacy(viewerId, profileUser, settings, { isFriend = false } = {}) {
  if (!profileUser) return profileUser;
  if (viewerId === profileUser.id) return profileUser;

  const s = settings ?? DEFAULT_SETTINGS;
  const result = { ...profileUser };

  if (!isAllowed(s.lastSeenVisibility, isFriend)) {
    result.lastSeenAt = null;
  }
  if (!isAllowed(s.profilePhotoVisibility, isFriend)) {
    result.avatarUrl = null;
    result.customPhotoUrl = null;
    result.avatarGlbUrl = null;
    result.displayAvatarUrl = null;
  }
  return result;
}

function isAllowed(mode, isFriend) {
  if (mode === 'everyone') return true;
  if (mode === 'friends') return Boolean(isFriend);
  return false;
}
