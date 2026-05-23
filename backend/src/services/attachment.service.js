import * as attachmentRepo from '../repositories/attachment.repository.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../errors/errors.js';

const ALLOWED = {
  image: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  voice: ['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav'],
  file: null, // any
};
const MAX_SIZE = {
  image: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  voice: 25 * 1024 * 1024,
  file: 50 * 1024 * 1024,
};

function normalizeMime(mime) {
  if (!mime) return mime;
  return mime.split(';')[0].trim().toLowerCase();
}

function classify(mime) {
  const m = normalizeMime(mime);
  if (!m) return 'file';
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'voice';
  return 'file';
}

function toDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    messageId: row.message_id ?? null,
    uploadedBy: row.uploaded_by,
    kind: row.kind,
    url: row.url,
    mime: row.mime,
    size: Number(row.size),
    width: row.width ?? null,
    height: row.height ?? null,
    durationSeconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
    waveformPeaks: row.waveform_peaks ?? null,
    createdAt: row.created_at,
  };
}

export async function uploadFile(currentUserId, { mime, size, originalName, urlPath, width, height, durationSeconds, waveformPeaks }) {
  const normalized = normalizeMime(mime);
  const kind = classify(normalized);
  const allowed = ALLOWED[kind];
  if (allowed && !allowed.includes(normalized)) {
    throw new ValidationError(`Unsupported ${kind} mime type: ${mime}`);
  }
  if (size > MAX_SIZE[kind]) {
    throw new ValidationError(`File too large for ${kind} (max ${MAX_SIZE[kind]} bytes)`);
  }

  const row = await attachmentRepo.create({
    uploadedBy: currentUserId,
    kind, mime: normalized, size, url: urlPath,
    width, height, durationSeconds, waveformPeaks,
  });
  return toDto(row);
}

export async function attachToMessage(messageId, attachmentIds, currentUserId) {
  if (!attachmentIds?.length) return [];
  for (const id of attachmentIds) {
    const a = await attachmentRepo.getById(id);
    if (!a) throw new NotFoundError(`Attachment not found: ${id}`);
    if (a.uploaded_by !== currentUserId) {
      throw new ForbiddenError('Cannot attach files uploaded by someone else');
    }
    if (a.message_id) {
      throw new ForbiddenError('Attachment is already attached to a message');
    }
  }
  await attachmentRepo.attachToMessage(messageId, attachmentIds);
  const rows = await attachmentRepo.getByMessage(messageId);
  return rows.map(toDto);
}

export async function listForMessage(messageId) {
  const rows = await attachmentRepo.getByMessage(messageId);
  return rows.map(toDto);
}
