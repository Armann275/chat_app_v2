import { apiClient } from './client';

export async function listMyChats({ limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get('/chats', { params: { limit, offset } });
  return data.data.chats;
}

export async function getChat(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}`);
  return data.data.chat;
}

export async function getMembers(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}/members`);
  return data.data.members;
}

export async function createDirectChat(userId) {
  const { data } = await apiClient.post('/chats/direct', { userId });
  return data.data.chat;
}

export async function createGroupChat({ name, description, memberIds }) {
  const { data } = await apiClient.post('/chats/group', { name, description, memberIds });
  return data.data.chat;
}

export async function createChannel({ name, description, memberIds = [] }) {
  const { data } = await apiClient.post('/chats/channel', { name, description, memberIds });
  return data.data.chat;
}

export async function updateGroup(chatId, { name, description }) {
  const { data } = await apiClient.patch(`/chats/${chatId}`, { name, description });
  return data.data.chat;
}

export async function setMemberRole(chatId, userId, role) {
  const { data } = await apiClient.patch(
    `/chats/${chatId}/members/${userId}/role`,
    { role },
  );
  return data.data.member;
}

export async function addMembers(chatId, memberIds) {
  const { data } = await apiClient.post(`/chats/${chatId}/members`, { memberIds });
  return data.data.members;
}

export async function removeMember(chatId, userId) {
  const { data } = await apiClient.delete(`/chats/${chatId}/members/${userId}`);
  return data.data;
}

export async function leaveChat(chatId) {
  const { data } = await apiClient.post(`/chats/${chatId}/leave`);
  return data.data;
}

export async function deleteDirectChat(chatId, mode = 'for_me') {
  const { data } = await apiClient.delete(`/chats/${chatId}`, { params: { mode } });
  return data.data;
}

export async function listRequestChats({ limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get('/chats/requests', { params: { limit, offset } });
  return data.data.chats;
}

export async function acceptChatRequest(chatId) {
  const { data } = await apiClient.post(`/chats/${chatId}/accept-request`);
  return data.data.chat;
}

export async function rejectChatRequest(chatId) {
  const { data } = await apiClient.post(`/chats/${chatId}/reject-request`);
  return data.data;
}

export async function setDisappearing(chatId, disappearingSeconds) {
  const { data } = await apiClient.patch(`/chats/${chatId}/disappearing`, {
    disappearingSeconds,
  });
  return data.data.chat;
}
