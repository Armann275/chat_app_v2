import { apiClient } from './client';

export async function getDelta(lastSyncedAt) {
  const params = lastSyncedAt ? { lastSyncedAt } : {};
  const { data } = await apiClient.get('/sync/delta', { params });
  return data.data;
}

export async function postOfflineQueue(items) {
  const { data } = await apiClient.post('/sync/offline-queue', { items });
  return data.data.results;
}
