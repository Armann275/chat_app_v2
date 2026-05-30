import { apiClient } from './client';

export async function getStatus() {
  const { data } = await apiClient.get('/me/2fa/status');
  return data.data;
}

export async function beginSetup() {
  const { data } = await apiClient.post('/me/2fa/setup');
  return data.data;
}

export async function enable(code) {
  const { data } = await apiClient.post('/me/2fa/enable', { code });
  return data.data;
}

export async function disable(code) {
  const { data } = await apiClient.post('/me/2fa/disable', { code });
  return data.data;
}

export async function regenerateBackupCodes() {
  const { data } = await apiClient.post('/me/2fa/backup-codes/regenerate');
  return data.data;
}

export async function verify2fa({ token, code }) {
  const { data } = await apiClient.post('/auth/2fa/verify', { token, code });
  return data.data;
}
