import { apiClient } from './client';

export async function uploadFile(file, { width, height, durationSeconds, waveformPeaks } = {}) {
  const form = new FormData();
  form.append('file', file);
  if (width != null) form.append('width', String(width));
  if (height != null) form.append('height', String(height));
  if (durationSeconds != null) form.append('durationSeconds', String(durationSeconds));
  if (waveformPeaks != null) form.append('waveformPeaks', JSON.stringify(waveformPeaks));
  const { data } = await apiClient.post('/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.attachment;
}

export function resolveAttachmentUrl(url) {
  if (!url) return url;
  if (/^https?:/i.test(url)) return url;
  const base = apiClient.defaults.baseURL ?? '';
  return `${base.replace(/\/$/, '')}${url}`;
}
