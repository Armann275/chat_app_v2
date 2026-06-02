import { apiClient } from './client';

export async function register(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data.data;
}

export async function login(payload) {
  const { data } = await apiClient.post('/auth/login', payload);
  return data.data;
}

export async function verifyEmail(payload) {
  const { data } = await apiClient.post('/auth/verify-email', payload);
  return data.data;
}

export async function resendCode(payload) {
  const { data } = await apiClient.post('/auth/resend-code', payload);
  return data.data;
}

export async function forgotPassword(payload) {
  const { data } = await apiClient.post('/auth/forgot-password', payload);
  return data.data;
}

export async function resetPassword(payload) {
  const { data } = await apiClient.post('/auth/reset-password', payload);
  return data.data;
}

let refreshInFlight = null;

export async function refresh() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = apiClient
    .post('/auth/refresh', null, { skipAuthRefresh: true })
    .then(({ data }) => data.data)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function logout() {
  const { data } = await apiClient.post('/auth/logout');
  return data.data;
}

export async function me() {
  const { data } = await apiClient.get('/auth/me');
  return data.data.user;
}
