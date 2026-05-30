import { apiClient } from './client';

export async function initiateCall(chatId, type) {
  const { data } = await apiClient.post(`/chats/${chatId}/calls`, { type });
  return data.data.call;
}

export async function acceptCall(callId) {
  const { data } = await apiClient.post(`/calls/${callId}/accept`);
  return data.data.call;
}

export async function rejectCall(callId) {
  const { data } = await apiClient.post(`/calls/${callId}/reject`);
  return data.data.call;
}

export async function hangupCall(callId) {
  const { data } = await apiClient.post(`/calls/${callId}/hangup`);
  return data.data.call;
}

export async function listCallHistory({ limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get('/me/calls', { params: { limit, offset } });
  return data.data.calls;
}
