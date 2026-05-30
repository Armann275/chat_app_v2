import { apiClient } from './client';

export async function listSessions({ limit = 50, offset = 0 } = {}) {
  const { data } = await apiClient.get('/ai/sessions', { params: { limit, offset } });
  return data.data.sessions;
}

export async function createSession() {
  const { data } = await apiClient.post('/ai/sessions');
  return data.data.session;
}

export async function getSession(sessionId) {
  const { data } = await apiClient.get(`/ai/sessions/${sessionId}`);
  return data.data;
}

export async function deleteSession(sessionId) {
  const { data } = await apiClient.delete(`/ai/sessions/${sessionId}`);
  return data.data;
}

export async function sendMessage(sessionId, content) {
  const { data } = await apiClient.post(`/ai/sessions/${sessionId}/messages`, {
    content,
  });
  return data.data;
}
