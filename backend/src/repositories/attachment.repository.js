import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const COLS = `id, message_id, uploaded_by, kind, url, mime, size, width, height, duration_seconds, waveform_peaks, created_at`;

export async function create({ uploadedBy, kind, url, mime, size, width, height, durationSeconds, waveformPeaks }) {
  const result = await dataSource.query(
    `
      INSERT INTO attachments (uploaded_by, kind, url, mime, size, width, height, duration_seconds, waveform_peaks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${COLS}
    `,
    [
      uploadedBy, kind, url, mime, size,
      width ?? null, height ?? null,
      durationSeconds ?? null,
      waveformPeaks ? JSON.stringify(waveformPeaks) : null,
    ],
  );
  return firstRow(result);
}

export async function getById(id) {
  const result = await dataSource.query(
    `SELECT ${COLS} FROM attachments WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(result);
}

export async function getByUrl(url) {
  const result = await dataSource.query(
    `SELECT ${COLS} FROM attachments WHERE url = $1 LIMIT 1`,
    [url],
  );
  return firstRow(result);
}

export async function getByMessage(messageId) {
  const rows = await dataSource.query(
    `SELECT ${COLS} FROM attachments WHERE message_id = $1 ORDER BY created_at ASC`,
    [messageId],
  );
  return rows;
}

export async function attachToMessage(messageId, attachmentIds) {
  if (!attachmentIds.length) return;
  await dataSource.query(
    `UPDATE attachments SET message_id = $1
       WHERE id = ANY($2::uuid[]) AND message_id IS NULL`,
    [messageId, attachmentIds],
  );
}
