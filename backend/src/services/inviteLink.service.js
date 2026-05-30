import { randomBytes } from 'node:crypto';
import * as inviteRepo from '../repositories/inviteLink.repository.js';
import * as chatRepo from '../repositories/chat.repository.js';
import { emitToChat, emitToUser } from '../sockets/realtime.js';
import { canManageInvites } from '../utils/chatPermissions.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../errors/errors.js';

const CODE_BYTES = 8;
const MAX_CODE_RETRIES = 5;

function generateCode() {
  return randomBytes(CODE_BYTES).toString('base64url');
}

function toDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    chatId: row.chat_id,
    code: row.code,
    createdBy: row.created_by,
    expiresAt: row.expires_at ?? null,
    maxUses: row.max_uses ?? null,
    uses: row.uses ?? 0,
    revokedAt: row.revoked_at ?? null,
    createdAt: row.created_at,
  };
}

async function ensureChatAdmin(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type === 'direct') {
    throw new ValidationError('Direct chats do not support invite links');
  }
  const membership = await chatRepo.getMembership(chatId, currentUserId);
  if (!membership) throw new ForbiddenError('Not a member of this chat');
  if (!canManageInvites(membership.role)) {
    throw new ForbiddenError('Only admins can manage invite links');
  }
  return { chat, membership };
}

export async function create(currentUserId, chatId, { expiresAt = null, maxUses = null } = {}) {
  await ensureChatAdmin(currentUserId, chatId);
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    throw new ValidationError('maxUses must be a positive integer');
  }
  let expiry = null;
  if (expiresAt != null) {
    const d = new Date(expiresAt);
    if (Number.isNaN(d.getTime())) {
      throw new ValidationError('expiresAt must be a valid ISO timestamp');
    }
    if (d.getTime() <= Date.now()) {
      throw new ValidationError('expiresAt must be in the future');
    }
    expiry = d.toISOString();
  }

  for (let i = 0; i < MAX_CODE_RETRIES; i += 1) {
    try {
      const row = await inviteRepo.create({
        chatId,
        code: generateCode(),
        createdBy: currentUserId,
        expiresAt: expiry,
        maxUses,
      });
      return toDto(row);
    } catch (err) {
      if (err?.code !== '23505') throw err;
    }
  }
  throw new ConflictError('Could not generate unique invite code');
}

export async function list(currentUserId, chatId) {
  await ensureChatAdmin(currentUserId, chatId);
  const result = await inviteRepo.listByChat(chatId);
  return result.map(toDto);
}

export async function revoke(currentUserId, chatId, linkId) {
  await ensureChatAdmin(currentUserId, chatId);
  const link = await inviteRepo.findById(linkId);
  if (!link || link.chat_id !== chatId) {
    throw new NotFoundError('Invite link not found');
  }
  if (link.revoked_at) return toDto(link);
  const updated = await inviteRepo.revoke(linkId);
  return toDto(updated);
}

function isUsable(link) {
  if (link.revoked_at) return false;
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
    return false;
  }
  if (link.max_uses != null && link.uses >= link.max_uses) return false;
  return true;
}

export async function redeem(currentUserId, code) {
  const link = await inviteRepo.findByCode(code);
  if (!link) throw new NotFoundError('Invite link not found');
  if (!isUsable(link)) throw new ConflictError('Invite link is no longer valid');

  const chat = await chatRepo.getChatById(link.chat_id);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.join_mode === 'closed') {
    throw new ConflictError('This chat is closed to new members');
  }

  const existing = await chatRepo.getMembership(link.chat_id, currentUserId);
  if (existing) {
    return { chat: chat.id, alreadyMember: true };
  }

  await chatRepo.addMember({
    chatId: link.chat_id,
    userId: currentUserId,
    role: 'member',
  });
  await inviteRepo.incrementUses(link.id);

  emitToChat(link.chat_id, 'chat:member-added', {
    chatId: link.chat_id,
    userId: currentUserId,
    via: 'invite-link',
  });
  emitToUser(currentUserId, 'chat:joined', { chatId: link.chat_id });

  return { chatId: link.chat_id, joined: true };
}
