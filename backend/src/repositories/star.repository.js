import { dataSource } from '../config/database.js';

export async function star({ userId, messageId }) {
  await dataSource.query(
    `
      INSERT INTO user_starred_messages (user_id, message_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, message_id) DO NOTHING
    `,
    [userId, messageId],
  );
}

export async function unstar({ userId, messageId }) {
  await dataSource.query(
    `DELETE FROM user_starred_messages WHERE user_id = $1 AND message_id = $2`,
    [userId, messageId],
  );
}

export async function listForUser(userId, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT m.id, m.chat_id, m.sender_id, m.content, m.reply_to_message_id,
             m.edited_at, m.deleted_at, m.created_at, m.updated_at,
             usm.starred_at
        FROM user_starred_messages usm
        JOIN messages m ON m.id = usm.message_id
        JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = $1
       WHERE usm.user_id = $1
         AND m.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM message_deletions md
            WHERE md.message_id = m.id AND md.user_id = $1
         )
       ORDER BY usm.starred_at DESC
       LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return rows;
}
