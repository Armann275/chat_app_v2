import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function upsert({ chatId, userId, content }) {
  const result = await dataSource.query(
    `
      INSERT INTO chat_drafts (chat_id, user_id, content, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (chat_id, user_id)
        DO UPDATE SET content = EXCLUDED.content, updated_at = now()
      RETURNING chat_id, user_id, content, updated_at
    `,
    [chatId, userId, content],
  );
  return firstRow(result);
}

export async function get(chatId, userId) {
  const result = await dataSource.query(
    `SELECT chat_id, user_id, content, updated_at FROM chat_drafts WHERE chat_id = $1 AND user_id = $2 LIMIT 1`,
    [chatId, userId],
  );
  return firstRow(result);
}

export async function clear(chatId, userId) {
  await dataSource.query(
    `DELETE FROM chat_drafts WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId],
  );
}
