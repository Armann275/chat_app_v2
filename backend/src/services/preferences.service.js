import * as prefsRepo from '../repositories/preferences.repository.js';
import * as chatService from './chat.service.js';

const DEFAULT_USER_PREFS = {
  darkMode: false,
  notificationsEnabled: true,
};

const DEFAULT_CHAT_PREFS = {
  mutedUntil: null,
  archived: false,
  notifications: 'default',
};

function userPrefsToDto(row) {
  if (!row) return DEFAULT_USER_PREFS;
  return {
    darkMode: row.dark_mode,
    notificationsEnabled: row.notifications_enabled,
    updatedAt: row.updated_at,
  };
}

function chatPrefsToDto(row) {
  if (!row) return { ...DEFAULT_CHAT_PREFS };
  return {
    chatId: row.chat_id,
    mutedUntil: row.muted_until ?? null,
    archived: row.archived,
    notifications: row.notifications,
    updatedAt: row.updated_at,
  };
}

export async function getUserPrefs(userId) {
  return userPrefsToDto(await prefsRepo.getUserPrefs(userId));
}

export async function updateUserPrefs(userId, patch) {
  return userPrefsToDto(await prefsRepo.upsertUserPrefs(userId, patch));
}

export async function getChatPrefs(currentUserId, chatId) {
  await chatService.assertMembership(chatId, currentUserId);
  return chatPrefsToDto(await prefsRepo.getChatPrefs(chatId, currentUserId));
}

export async function updateChatPrefs(currentUserId, chatId, patch) {
  await chatService.assertMembership(chatId, currentUserId);
  return chatPrefsToDto(await prefsRepo.upsertChatPrefs(chatId, currentUserId, patch));
}
