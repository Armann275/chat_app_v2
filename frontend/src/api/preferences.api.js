import { apiClient } from './client';

export async function getMyPreferences() {
  const { data } = await apiClient.get('/users/me/preferences');
  return data.data.preferences;
}

export async function updateMyPreferences(patch) {
  const { data } = await apiClient.patch('/users/me/preferences', patch);
  return data.data.preferences;
}

export async function getChatPreferences(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}/preferences`);
  return data.data.preferences;
}

export async function updateChatPreferences(chatId, patch) {
  const { data } = await apiClient.patch(`/chats/${chatId}/preferences`, patch);
  return data.data.preferences;
}
