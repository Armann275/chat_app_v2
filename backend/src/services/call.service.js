import * as callRepo from '../repositories/call.repository.js';
import * as chatRepo from '../repositories/chat.repository.js';
import { emitToChat, emitToUser } from '../sockets/realtime.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../errors/errors.js';

const MISSED_TIMEOUT_MS = 30 * 1000;
const ALLOWED_TYPES = new Set(['voice', 'video']);
const ACTIVE_STATUSES = new Set(['ringing', 'active']);

const missedTimers = new Map();

function toDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    chatId: row.chat_id,
    initiatorId: row.initiator_id,
    type: row.type,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
  };
}

async function ensureMembership(chatId, userId) {
  const membership = await chatRepo.getMembership(chatId, userId);
  if (!membership) throw new ForbiddenError('Not a member of this chat');
  return membership;
}

async function getCallOrThrow(callId) {
  const call = await callRepo.findById(callId);
  if (!call) throw new NotFoundError('Call not found');
  return call;
}

function clearMissedTimer(callId) {
  const t = missedTimers.get(callId);
  if (t) {
    clearTimeout(t);
    missedTimers.delete(callId);
  }
}

function scheduleMissedTimer(callId) {
  const t = setTimeout(() => {
    handleMissedTimeout(callId).catch(() => {});
  }, MISSED_TIMEOUT_MS);
  // Don't block process exit on this timer.
  if (typeof t.unref === 'function') t.unref();
  missedTimers.set(callId, t);
}

async function handleMissedTimeout(callId) {
  missedTimers.delete(callId);
  const call = await callRepo.findById(callId);
  if (!call || call.status !== 'ringing') return;
  const updated = await callRepo.setStatus(callId, 'missed', {
    endedAt: new Date(),
  });
  emitToChat(call.chat_id, 'call:missed', toDto(updated));
}

export async function initiate(currentUserId, chatId, type) {
  if (!ALLOWED_TYPES.has(type)) {
    throw new ValidationError('type must be one of: voice, video');
  }
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type !== 'direct') {
    throw new ValidationError('Calls are only supported in direct chats');
  }
  await ensureMembership(chatId, currentUserId);

  const call = await callRepo.create({
    chatId,
    initiatorId: currentUserId,
    type,
  });
  await callRepo.addParticipant(call.id, currentUserId);

  const members = await chatRepo.getMembers(chatId);
  for (const member of members) {
    if (member.user_id !== currentUserId) {
      await callRepo.addParticipant(call.id, member.user_id);
    }
  }

  const dto = toDto(call);
  emitToChat(chatId, 'call:initiated', dto);
  scheduleMissedTimer(call.id);
  return dto;
}

export async function accept(currentUserId, callId) {
  const call = await getCallOrThrow(callId);
  if (call.initiator_id === currentUserId) {
    throw new ForbiddenError('Initiator cannot accept their own call');
  }
  if (!ACTIVE_STATUSES.has(call.status) && call.status !== 'ringing') {
    throw new ConflictError(`Cannot accept call in status ${call.status}`);
  }
  await ensureMembership(call.chat_id, currentUserId);

  clearMissedTimer(call.id);
  const updated = await callRepo.setStatus(call.id, 'active');
  await callRepo.markParticipantJoined(call.id, currentUserId);

  const dto = toDto(updated);
  emitToChat(call.chat_id, 'call:accepted', { ...dto, acceptedBy: currentUserId });
  return dto;
}

export async function reject(currentUserId, callId) {
  const call = await getCallOrThrow(callId);
  if (call.initiator_id === currentUserId) {
    throw new ForbiddenError('Initiator cannot reject their own call');
  }
  if (call.status !== 'ringing') {
    throw new ConflictError(`Cannot reject call in status ${call.status}`);
  }
  await ensureMembership(call.chat_id, currentUserId);

  clearMissedTimer(call.id);
  const updated = await callRepo.setStatus(call.id, 'rejected', {
    endedAt: new Date(),
  });

  const dto = toDto(updated);
  emitToChat(call.chat_id, 'call:rejected', { ...dto, rejectedBy: currentUserId });
  return dto;
}

export async function hangup(currentUserId, callId) {
  const call = await getCallOrThrow(callId);
  await ensureMembership(call.chat_id, currentUserId);

  if (['ended', 'rejected', 'missed', 'cancelled'].includes(call.status)) {
    return toDto(call);
  }

  clearMissedTimer(call.id);
  await callRepo.markParticipantLeft(call.id, currentUserId);

  // For 1:1 calls hangup ends the call. If never accepted by the other side, mark cancelled.
  const nextStatus = call.status === 'ringing' ? 'cancelled' : 'ended';
  const updated = await callRepo.setStatus(call.id, nextStatus, {
    endedAt: new Date(),
  });

  const dto = toDto(updated);
  emitToChat(call.chat_id, 'call:ended', { ...dto, endedBy: currentUserId });
  return dto;
}

export async function listHistory(currentUserId, { limit = 50, offset = 0 } = {}) {
  const list = await callRepo.listHistoryForUser(currentUserId, { limit, offset });
  return list.map(toDto);
}

export async function relaySignal(currentUserId, callId, event, payload) {
  const call = await getCallOrThrow(callId);
  await ensureMembership(call.chat_id, currentUserId);
  const members = await chatRepo.getMembers(call.chat_id);
  for (const member of members) {
    if (member.user_id !== currentUserId) {
      emitToUser(member.user_id, event, {
        callId,
        fromUserId: currentUserId,
        ...payload,
      });
    }
  }
}

export const __test__ = {
  missedTimers,
  MISSED_TIMEOUT_MS,
};
