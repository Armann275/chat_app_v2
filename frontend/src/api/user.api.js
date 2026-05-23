import { apiClient } from './client';

export async function getProfile() {
  const { data } = await apiClient.get('/users/me');
  return data.data.user;
}

export async function updateProfile(payload) {
  const { data } = await apiClient.patch('/users/me', payload);
  return data.data.user;
}

export async function searchUsers({ q, limit = 20, offset = 0 } = {}) {
  const { data } = await apiClient.get('/users/search', {
    params: { q, limit, offset },
  });
  return data.data.users;
}
