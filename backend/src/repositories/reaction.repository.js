import { dataSource } from '../config/database.js';

export async function add({ messageId, userId, emoji }) {
  await dataSource.query(
    `
      INSERT INTO message_reactions (message_id, user_id, emoji)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
    `,
    [messageId, userId, emoji],
  );
}

export async function remove({ messageId, userId, emoji }) {
  await dataSource.query(
    `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji],
  );
}

export async function listForMessage(messageId) {
  const rows = await dataSource.query(
    `
      SELECT user_id, emoji, created_at
        FROM message_reactions
       WHERE message_id = $1
       ORDER BY created_at ASC
    `,
    [messageId],
  );
  return rows;
}
