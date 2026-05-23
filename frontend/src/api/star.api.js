import { apiClient } from './client';

export async function listStarred({ limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get('/messages/starred', {
    params: { limit, offset },
  });
  return data.data.messages;
}

export async function star(messageId) {
  const { data } = await apiClient.post(`/messages/${messageId}/star`);
  return data.data;
}

export async function unstar(messageId) {
  const { data } = await apiClient.delete(`/messages/${messageId}/star`);
  return data.data;
}
