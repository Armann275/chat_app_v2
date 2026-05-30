import { apiClient } from './client';

export async function getMyPrivacy() {
  const { data } = await apiClient.get('/me/privacy');
  return data.data.privacy;
}

export async function updateMyPrivacy(payload) {
  // Back-compat: a bare string is treated as { whoCanMessage }.
  const body = typeof payload === 'string' ? { whoCanMessage: payload } : payload;
  const { data } = await apiClient.put('/me/privacy', body);
  return data.data.privacy;
}
