import { apiClient } from './client';

export async function blockUser(userId) {
  const { data } = await apiClient.post(`/users/${userId}/block`);
  return data.data;
}

export async function unblockUser(userId) {
  const { data } = await apiClient.delete(`/users/${userId}/block`);
  return data.data;
}

export async function listBlocked() {
  const { data } = await apiClient.get('/me/blocks');
  return data.data.blocked ?? data.data;
}

export async function reportUser(userId, { reason, details }) {
  const { data } = await apiClient.post(`/users/${userId}/report`, { reason, details });
  return data.data;
}
