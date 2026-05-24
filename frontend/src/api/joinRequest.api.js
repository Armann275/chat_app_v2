import { apiClient } from './client';

export async function listPending(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}/join-requests`);
  return data.data.requests;
}

export async function requestToJoin(chatId, { message } = {}) {
  const { data } = await apiClient.post(`/chats/${chatId}/join-requests`, { message });
  return data.data;
}

export async function approve(chatId, userId) {
  const { data } = await apiClient.post(
    `/chats/${chatId}/join-requests/${userId}/approve`,
  );
  return data.data.request;
}

export async function reject(chatId, userId) {
  const { data } = await apiClient.post(
    `/chats/${chatId}/join-requests/${userId}/reject`,
  );
  return data.data.request;
}
