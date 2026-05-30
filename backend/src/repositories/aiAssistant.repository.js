import { dataSource } from '../config/database.js';
import { firstRow, rows } from './_util.js';

export async function createSession(userId, title = null) {
  const result = await dataSource.query(
    `
      INSERT INTO ai_sessions (user_id, title)
      VALUES ($1, $2)
      RETURNING id, user_id, title, created_at, updated_at
    `,
    [userId, title],
  );
  return firstRow(result);
}

export async function findSessionById(sessionId) {
  const result = await dataSource.query(
    `SELECT id, user_id, title, created_at, updated_at
       FROM ai_sessions WHERE id = $1 LIMIT 1`,
    [sessionId],
  );
  return firstRow(result);
}

export async function listSessionsForUser(userId, { limit, offset }) {
  return rows(
    await dataSource.query(
      `SELECT id, user_id, title, created_at, updated_at
         FROM ai_sessions
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
  );
}

export async function updateSessionTitle(sessionId, title) {
  const result = await dataSource.query(
    `UPDATE ai_sessions
        SET title = $2,
            updated_at = now()
      WHERE id = $1
      RETURNING id, user_id, title, created_at, updated_at`,
    [sessionId, title],
  );
  return firstRow(result);
}

export async function touchSession(sessionId) {
  await dataSource.query(
    `UPDATE ai_sessions SET updated_at = now() WHERE id = $1`,
    [sessionId],
  );
}

export async function deleteSession(sessionId) {
  await dataSource.query(`DELETE FROM ai_sessions WHERE id = $1`, [sessionId]);
}

export async function insertMessage(sessionId, role, content) {
  const result = await dataSource.query(
    `
      INSERT INTO ai_messages (session_id, role, content)
      VALUES ($1, $2, $3)
      RETURNING id, session_id, role, content, created_at
    `,
    [sessionId, role, content],
  );
  return firstRow(result);
}

export async function listMessages(sessionId, { limit, offset }) {
  return rows(
    await dataSource.query(
      `SELECT id, session_id, role, content, created_at
         FROM ai_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
        LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset],
    ),
  );
}

export async function listRecentMessages(sessionId, max) {
  const recent = rows(
    await dataSource.query(
      `SELECT id, session_id, role, content, created_at
         FROM ai_messages
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [sessionId, max],
    ),
  );
  return recent.reverse();
}
