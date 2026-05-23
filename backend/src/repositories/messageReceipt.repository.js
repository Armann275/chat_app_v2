import { dataSource } from '../config/database.js';

export async function markDelivered({ messageId, userId }) {
  await dataSource.query(
    `
      INSERT INTO message_receipts (message_id, user_id, delivered_at)
      VALUES ($1, $2, now())
      ON CONFLICT (message_id, user_id)
        DO UPDATE SET delivered_at = COALESCE(message_receipts.delivered_at, EXCLUDED.delivered_at)
    `,
    [messageId, userId],
  );
}

export async function markSeen({ messageId, userId }) {
  await dataSource.query(
    `
      INSERT INTO message_receipts (message_id, user_id, delivered_at, seen_at)
      VALUES ($1, $2, now(), now())
      ON CONFLICT (message_id, user_id)
        DO UPDATE SET
          delivered_at = COALESCE(message_receipts.delivered_at, EXCLUDED.delivered_at),
          seen_at      = COALESCE(message_receipts.seen_at, EXCLUDED.seen_at)
    `,
    [messageId, userId],
  );
}

export async function getUnreadCount(userId, chatId) {
  const rows = await dataSource.query(
    `
      SELECT COUNT(*)::int AS unread
        FROM messages m
        LEFT JOIN message_receipts r
          ON r.message_id = m.id AND r.user_id = $1
       WHERE m.chat_id = $2
         AND m.sender_id <> $1
         AND m.deleted_at IS NULL
         AND (r.seen_at IS NULL)
    `,
    [userId, chatId],
  );
  return rows[0]?.unread ?? 0;
}

export async function getUnreadCountsForUser(userId) {
  const rows = await dataSource.query(
    `
      SELECT m.chat_id, COUNT(*)::int AS unread
        FROM messages m
        JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = $1
        LEFT JOIN message_receipts r
          ON r.message_id = m.id AND r.user_id = $1
       WHERE m.sender_id <> $1
         AND m.deleted_at IS NULL
         AND r.seen_at IS NULL
    GROUP BY m.chat_id
    `,
    [userId],
  );
  return rows;
}
