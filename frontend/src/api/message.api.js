import { apiClient } from './client';

export async function getMessages(chatId, { limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get(`/chats/${chatId}/messages`, {
    params: { limit, offset },
  });
  return data.data.messages;
}

export async function sendMessage(
  chatId,
  { content, replyToMessageId, asThreadReply, attachmentIds } = {},
) {
  const { data } = await apiClient.post(`/chats/${chatId}/messages`, {
    content,
    replyToMessageId: replyToMessageId ?? null,
    asThreadReply: Boolean(asThreadReply),
    attachmentIds: attachmentIds ?? [],
  });
  return data.data.message;
}

export async function editMessage(chatId, messageId, content) {
  const { data } = await apiClient.patch(`/chats/${chatId}/messages/${messageId}`, {
    content,
  });
  return data.data.message;
}

export async function deleteMessage(chatId, messageId, mode = 'for_me') {
  const { data } = await apiClient.delete(`/chats/${chatId}/messages/${messageId}`, {
    params: { mode },
  });
  return data.data;
}

export async function markSeen(chatId, messageId) {
  const { data } = await apiClient.post(`/chats/${chatId}/messages/${messageId}/seen`);
  return data.data;
}

export async function searchMessages({ q, chatId, limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get('/messages/search', {
    params: { q, chatId, limit, offset },
  });
  return data.data.messages;
}

export async function getThread(chatId, messageId, { limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get(`/chats/${chatId}/messages/${messageId}/thread`, {
    params: { limit, offset },
  });
  return data.data;
}
