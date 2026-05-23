import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function getReadCursor(userId, chatId) {
  const result = await dataSource.query(
    `SELECT user_id, chat_id, last_read_message_id, last_read_at FROM chat_read_cursors WHERE user_id = $1 AND chat_id = $2 LIMIT 1`,
    [userId, chatId],
  );
  return firstRow(result);
}

export async function upsertReadCursor({ userId, chatId, lastReadMessageId }) {
  const result = await dataSource.query(
    `
      INSERT INTO chat_read_cursors (user_id, chat_id, last_read_message_id, last_read_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id, chat_id) DO UPDATE SET
        last_read_message_id = EXCLUDED.last_read_message_id,
        last_read_at = now()
      RETURNING user_id, chat_id, last_read_message_id, last_read_at
    `,
    [userId, chatId, lastReadMessageId],
  );
  return firstRow(result);
}

export async function getDeltaSince(userId, since) {
  const messages = await dataSource.query(
    `
      SELECT m.id, m.chat_id, m.sender_id, m.content,
             m.reply_to_message_id, m.forwarded_from_message_id, m.thread_root_id,
             m.edited_at, m.deleted_at, m.created_at, m.updated_at
        FROM messages m
        JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = $1
       WHERE m.updated_at > $2
       ORDER BY m.updated_at ASC
       LIMIT 500
    `,
    [userId, since],
  );

  const receipts = await dataSource.query(
    `
      SELECT r.message_id, r.user_id, r.delivered_at, r.seen_at
        FROM message_receipts r
        JOIN messages m ON m.id = r.message_id
        JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = $1
       WHERE GREATEST(COALESCE(r.delivered_at, '-infinity'::timestamptz),
                      COALESCE(r.seen_at, '-infinity'::timestamptz)) > $2
       ORDER BY GREATEST(COALESCE(r.delivered_at, '-infinity'::timestamptz),
                          COALESCE(r.seen_at, '-infinity'::timestamptz)) ASC
       LIMIT 500
    `,
    [userId, since],
  );

  return { messages, receipts };
}
