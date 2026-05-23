import { apiClient } from './client';

export async function getDraft(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}/draft`);
  return data.data.draft;
}

export async function saveDraft(chatId, content) {
  const { data } = await apiClient.put(`/chats/${chatId}/draft`, { content });
  return data.data.draft;
}

export async function clearDraft(chatId) {
  const { data } = await apiClient.delete(`/chats/${chatId}/draft`);
  return data.data;
}
