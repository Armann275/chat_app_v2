import { apiClient } from './client';

export async function listMySessions() {
  const { data } = await apiClient.get('/me/sessions');
  return data.data.sessions;
}

export async function revokeSession(sessionId) {
  const { data } = await apiClient.delete(`/me/sessions/${sessionId}`);
  return data.data;
}

export async function revokeOtherSessions() {
  const { data } = await apiClient.post('/me/sessions/revoke-others');
  return data.data;
}
