import * as draftRepo from '../repositories/draft.repository.js';
import * as chatService from './chat.service.js';

function toDto(row) {
  if (!row) return null;
  return {
    chatId: row.chat_id,
    userId: row.user_id,
    content: row.content,
    updatedAt: row.updated_at,
  };
}

export async function get(currentUserId, chatId) {
  await chatService.assertMembership(chatId, currentUserId);
  const row = await draftRepo.get(chatId, currentUserId);
  return toDto(row);
}

export async function save(currentUserId, chatId, content) {
  await chatService.assertMembership(chatId, currentUserId);
  if (!content || content.trim().length === 0) {
    await draftRepo.clear(chatId, currentUserId);
    return null;
  }
  const row = await draftRepo.upsert({ chatId, userId: currentUserId, content });
  return toDto(row);
}

export async function clear(currentUserId, chatId) {
  await chatService.assertMembership(chatId, currentUserId);
  await draftRepo.clear(chatId, currentUserId);
}
