import { apiClient } from './client';

export async function forwardMessages({ messageIds, toChatIds }) {
  const { data } = await apiClient.post('/messages/forward', {
    messageIds,
    toChatIds,
  });
  return data.data.messages;
}
