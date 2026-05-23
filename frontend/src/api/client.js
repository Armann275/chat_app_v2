import axios from 'axios';
import { env } from '@/config/env';
import { useAuthStore, getAccessToken } from '@/stores/authStore';

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (
      status !== 401 ||
      !original ||
      original._retried ||
      original.skipAuthRefresh ||
      isRefreshCall
    ) {
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      if (!refreshPromise) {
        refreshPromise = apiClient
          .post('/auth/refresh', null, { skipAuthRefresh: true })
          .then(({ data }) => {
            const { user, accessToken } = data.data;
            useAuthStore.getState().setAuth({ user, accessToken });
            return accessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  },
);
