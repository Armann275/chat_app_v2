import { apiClient } from './client';

export async function setGeneratedAvatar({ style, seed }) {
  const { data } = await apiClient.post('/me/avatar/generated', { style, seed });
  return data.data.user;
}

export async function uploadCustomPhoto(file) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post('/me/avatar/custom', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.user;
}

export async function clearCustomPhoto() {
  const { data } = await apiClient.delete('/me/avatar/custom');
  return data.data.user;
}
