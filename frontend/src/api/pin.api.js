import { apiClient } from './client';

export async function listPins(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}/pins`);
  return data.data.pins ?? data.data;
}

export async function pin(chatId, messageId) {
  const { data } = await apiClient.post(`/chats/${chatId}/messages/${messageId}/pin`);
  return data.data;
}

export async function unpin(chatId, messageId) {
  const { data } = await apiClient.delete(`/chats/${chatId}/messages/${messageId}/pin`);
  return data.data;
}
