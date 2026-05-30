import { dataSource } from '../config/database.js';
import { firstRow, rows } from './_util.js';

const CALL_COLS = `id, chat_id, initiator_id, type, status, started_at, ended_at`;

export async function create({ chatId, initiatorId, type }) {
  const result = await dataSource.query(
    `
      INSERT INTO calls (chat_id, initiator_id, type, status)
      VALUES ($1, $2, $3, 'ringing')
      RETURNING ${CALL_COLS}
    `,
    [chatId, initiatorId, type],
  );
  return firstRow(result);
}

export async function findById(id) {
  const result = await dataSource.query(
    `SELECT ${CALL_COLS} FROM calls WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(result);
}

export async function setStatus(id, status, { endedAt = null } = {}) {
  const result = await dataSource.query(
    `
      UPDATE calls
         SET status = $2,
             ended_at = COALESCE($3, ended_at)
       WHERE id = $1
       RETURNING ${CALL_COLS}
    `,
    [id, status, endedAt],
  );
  return firstRow(result);
}

export async function addParticipant(callId, userId) {
  await dataSource.query(
    `
      INSERT INTO call_participants (call_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (call_id, user_id) DO NOTHING
    `,
    [callId, userId],
  );
}

export async function markParticipantJoined(callId, userId) {
  await dataSource.query(
    `
      INSERT INTO call_participants (call_id, user_id, joined_at)
      VALUES ($1, $2, now())
      ON CONFLICT (call_id, user_id) DO UPDATE SET joined_at = COALESCE(call_participants.joined_at, now())
    `,
    [callId, userId],
  );
}

export async function markParticipantLeft(callId, userId) {
  await dataSource.query(
    `UPDATE call_participants SET left_at = now() WHERE call_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [callId, userId],
  );
}

export async function listParticipants(callId) {
  const result = await dataSource.query(
    `SELECT call_id, user_id, joined_at, left_at FROM call_participants WHERE call_id = $1`,
    [callId],
  );
  return rows(result);
}

export async function listHistoryForUser(userId, { limit = 50, offset = 0 } = {}) {
  const result = await dataSource.query(
    `
      SELECT DISTINCT ${CALL_COLS.split(',').map((c) => `c.${c.trim()}`).join(', ')}
        FROM calls c
        JOIN call_participants p ON p.call_id = c.id
       WHERE p.user_id = $1
       ORDER BY c.started_at DESC
       LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return rows(result);
}
