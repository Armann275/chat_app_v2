import * as repo from '../repositories/privacySettings.repository.js';
import { emitToUser } from '../sockets/realtime.js';
import { ValidationError } from '../errors/errors.js';

const ALLOWED_MODES = new Set(['everyone', 'friends', 'nobody']);

function toDto(row) {
  return {
    whoCanMessage: row?.who_can_message ?? 'everyone',
    updatedAt: row?.updated_at ?? null,
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

export async function updateMine(userId, whoCanMessage) {
  if (!ALLOWED_MODES.has(whoCanMessage)) {
    throw new ValidationError('whoCanMessage must be one of: everyone, friends, nobody');
  }
  const row = await repo.upsert(userId, whoCanMessage);
  const dto = toDto(row);
  emitToUser(userId, 'privacy:updated', dto);
  return dto;
}
