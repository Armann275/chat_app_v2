import { apiClient } from './client';

export async function listLinks(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}/invite-links`);
  return data.data.links;
}

export async function createLink(chatId, { expiresAt = null, maxUses = null } = {}) {
  const { data } = await apiClient.post(`/chats/${chatId}/invite-links`, {
    expiresAt, maxUses,
  });
  return data.data.link;
}

export async function revokeLink(chatId, linkId) {
  const { data } = await apiClient.delete(`/chats/${chatId}/invite-links/${linkId}`);
  return data.data.link;
}

export async function redeemLink(code) {
  const { data } = await apiClient.post(`/invites/${code}/join`);
  return data.data;
}
