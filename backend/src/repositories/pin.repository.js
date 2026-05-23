import { dataSource } from '../config/database.js';

export async function pin({ chatId, messageId, pinnedBy }) {
  await dataSource.query(
    `
      INSERT INTO chat_pinned_messages (chat_id, message_id, pinned_by)
      VALUES ($1, $2, $3)
      ON CONFLICT (chat_id, message_id) DO NOTHING
    `,
    [chatId, messageId, pinnedBy],
  );
}

export async function unpin({ chatId, messageId }) {
  await dataSource.query(
    `DELETE FROM chat_pinned_messages WHERE chat_id = $1 AND message_id = $2`,
    [chatId, messageId],
  );
}

export async function listForChat(chatId) {
  const rows = await dataSource.query(
    `
      SELECT cpm.chat_id, cpm.message_id, cpm.pinned_by, cpm.pinned_at,
             m.id, m.chat_id AS m_chat_id, m.sender_id, m.content,
             m.reply_to_message_id, m.edited_at, m.deleted_at,
             m.created_at, m.updated_at
        FROM chat_pinned_messages cpm
        JOIN messages m ON m.id = cpm.message_id
       WHERE cpm.chat_id = $1
       ORDER BY cpm.pinned_at DESC
    `,
    [chatId],
  );
  return rows;
}
