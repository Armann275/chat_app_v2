import { dataSource } from '../config/database.js';
import { firstRow, rows } from './_util.js';

const SELECT_COLS = `chat_id, user_id, status, message, requested_at, decided_by, decided_at`;

export async function upsertPending({ chatId, userId, message = null }) {
  const result = await dataSource.query(
    `
      INSERT INTO chat_join_requests (chat_id, user_id, status, message)
      VALUES ($1, $2, 'pending', $3)
      ON CONFLICT (chat_id, user_id) DO UPDATE
        SET status = 'pending',
            message = EXCLUDED.message,
            requested_at = now(),
            decided_by = NULL,
            decided_at = NULL
      RETURNING ${SELECT_COLS}
    `,
    [chatId, userId, message],
  );
  return firstRow(result);
}

export async function find(chatId, userId) {
  const result = await dataSource.query(
    `SELECT ${SELECT_COLS}
       FROM chat_join_requests
      WHERE chat_id = $1 AND user_id = $2 LIMIT 1`,
    [chatId, userId],
  );
  return firstRow(result);
}

export async function listPending(chatId) {
  const result = await dataSource.query(
    `
      SELECT jr.chat_id, jr.user_id, jr.status, jr.message,
             jr.requested_at, jr.decided_by, jr.decided_at,
             u.username, u.email, u.avatar_url, u.bio, u.last_seen_at,
             u.created_at AS user_created_at, u.updated_at AS user_updated_at
        FROM chat_join_requests jr
        JOIN users u ON u.id = jr.user_id
       WHERE jr.chat_id = $1 AND jr.status = 'pending'
       ORDER BY jr.requested_at ASC
    `,
    [chatId],
  );
  return rows(result);
}

export async function decide({ chatId, userId, status, decidedBy }) {
  const result = await dataSource.query(
    `
      UPDATE chat_join_requests
         SET status = $3,
             decided_by = $4,
             decided_at = now()
       WHERE chat_id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING ${SELECT_COLS}
    `,
    [chatId, userId, status, decidedBy],
  );
  return firstRow(result);
}
