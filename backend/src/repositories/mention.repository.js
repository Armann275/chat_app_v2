import { dataSource } from '../config/database.js';

export async function createMentions(messageId, userIds) {
  if (!userIds.length) return;
  const values = userIds.map((_, i) => `($1, $${i + 2})`).join(', ');
  await dataSource.query(
    `INSERT INTO message_mentions (message_id, user_id) VALUES ${values} ON CONFLICT DO NOTHING`,
    [messageId, ...userIds],
  );
}

export async function listForMessage(messageId) {
  const rows = await dataSource.query(
    `SELECT user_id FROM message_mentions WHERE message_id = $1`,
    [messageId],
  );
  return rows.map((r) => r.user_id);
}
