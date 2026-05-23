import { apiClient } from './client';

export async function addReaction(chatId, messageId, emoji) {
  const { data } = await apiClient.post(
    `/chats/${chatId}/messages/${messageId}/reactions`,
    { emoji },
  );
  return data.data;
}

export async function removeReaction(chatId, messageId, emoji) {
  const { data } = await apiClient.delete(
    `/chats/${chatId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
  );
  return data.data;
}
