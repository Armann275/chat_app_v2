import { apiClient } from './client';

export async function getMyPrivacy() {
  const { data } = await apiClient.get('/me/privacy');
  return data.data.privacy;
}

export async function updateMyPrivacy(whoCanMessage) {
  const { data } = await apiClient.put('/me/privacy', { whoCanMessage });
  return data.data.privacy;
}
