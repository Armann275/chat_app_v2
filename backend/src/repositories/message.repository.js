import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const MESSAGE_COLUMNS = `
  id, chat_id, sender_id, content, type, system_event, reply_to_message_id, forwarded_from_message_id, thread_root_id,
  edited_at, deleted_at, created_at, updated_at
`;

const MESSAGE_COLUMNS_M = `
  m.id, m.chat_id, m.sender_id, m.content, m.type, m.system_event, m.reply_to_message_id, m.forwarded_from_message_id, m.thread_root_id,
  m.edited_at, m.deleted_at, m.created_at, m.updated_at
`;

export async function create({
  chatId, senderId, content, type = 'user', systemEvent = null,
  replyToMessageId = null, forwardedFromMessageId = null, threadRootId = null,
}) {
  const result = await dataSource.query(
    `
      INSERT INTO messages (chat_id, sender_id, content, type, system_event, reply_to_message_id, forwarded_from_message_id, thread_root_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${MESSAGE_COLUMNS}
    `,
    [
      chatId, senderId, content, type,
      systemEvent ? JSON.stringify(systemEvent) : null,
      replyToMessageId, forwardedFromMessageId, threadRootId,
    ],
  );
  return firstRow(result);
}

export async function setThreadRoot(messageId, threadRootId) {
  await dataSource.query(
    `UPDATE messages SET thread_root_id = $2 WHERE id = $1`,
    [messageId, threadRootId],
  );
}

export async function getThreadMessages(rootId, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT ${MESSAGE_COLUMNS}
        FROM messages
       WHERE thread_root_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3
    `,
    [rootId, limit, offset],
  );
  return rows;
}

export async function getByChat(chatId, userId, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT ${MESSAGE_COLUMNS_M},
             COALESCE(r.reactions, '[]'::jsonb) AS reactions,
             COALESCE(a.attachments, '[]'::jsonb) AS attachments
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(jsonb_build_object(
            'userId', mr.user_id,
            'emoji', mr.emoji,
            'createdAt', mr.created_at
          )) AS reactions
            FROM message_reactions mr
           WHERE mr.message_id = m.id
        ) r ON true
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(jsonb_build_object(
            'id', att.id,
            'kind', att.kind,
            'url', att.url,
            'mime', att.mime,
            'size', att.size,
            'width', att.width,
            'height', att.height,
            'durationSeconds', att.duration_seconds,
            'waveformPeaks', att.waveform_peaks,
            'createdAt', att.created_at
          ) ORDER BY att.created_at) AS attachments
            FROM attachments att
           WHERE att.message_id = m.id
        ) a ON true
       WHERE m.chat_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM message_deletions md
            WHERE md.message_id = m.id AND md.user_id = $2
         )
         AND NOT EXISTS (
           SELECT 1 FROM chat_clears cc
            WHERE cc.chat_id = m.chat_id AND cc.user_id = $2
              AND m.created_at <= cc.cleared_at
         )
         AND (
           c.disappearing_seconds IS NULL
           OR m.created_at > now() - (c.disappearing_seconds || ' seconds')::interval
         )
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4
    `,
    [chatId, userId, limit, offset],
  );
  return rows;
}

export async function editMessage(messageId, content) {
  const result = await dataSource.query(
    `
      UPDATE messages
         SET content = $2,
             edited_at = now(),
             updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING ${MESSAGE_COLUMNS}
    `,
    [messageId, content],
  );
  return firstRow(result);
}

export async function softDeleteForEveryone(messageId) {
  const result = await dataSource.query(
    `
      UPDATE messages
         SET deleted_at = now(),
             updated_at = now()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING ${MESSAGE_COLUMNS}
    `,
    [messageId],
  );
  return firstRow(result);
}

export async function hideForUser(messageId, userId) {
  await dataSource.query(
    `
      INSERT INTO message_deletions (message_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (message_id, user_id) DO NOTHING
    `,
    [messageId, userId],
  );
}

export async function getById(id) {
  const result = await dataSource.query(
    `SELECT ${MESSAGE_COLUMNS} FROM messages WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(result);
}

export async function searchInChat(chatId, userId, query, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT ${MESSAGE_COLUMNS_M},
             ts_rank(to_tsvector('simple', m.content), plainto_tsquery('simple', $3)) AS rank
        FROM messages m
        JOIN chats c ON c.id = m.chat_id
       WHERE m.chat_id = $1
         AND m.type = 'user'
         AND m.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM message_deletions md
            WHERE md.message_id = m.id AND md.user_id = $2
         )
         AND (
           c.disappearing_seconds IS NULL
           OR m.created_at > now() - (c.disappearing_seconds || ' seconds')::interval
         )
         AND to_tsvector('simple', m.content) @@ plainto_tsquery('simple', $3)
       ORDER BY rank DESC, m.created_at DESC
       LIMIT $4 OFFSET $5
    `,
    [chatId, userId, query, limit, offset],
  );
  return rows;
}

export async function searchAll(userId, query, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT m.id, m.chat_id, m.sender_id, m.content, m.edited_at, m.deleted_at,
             m.created_at, m.updated_at,
             ts_rank(to_tsvector('simple', m.content), plainto_tsquery('simple', $2)) AS rank
        FROM messages m
        JOIN chat_members cm ON cm.chat_id = m.chat_id AND cm.user_id = $1
        JOIN chats c ON c.id = m.chat_id
       WHERE m.type = 'user'
         AND m.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM message_deletions md
            WHERE md.message_id = m.id AND md.user_id = $1
         )
         AND (
           c.disappearing_seconds IS NULL
           OR m.created_at > now() - (c.disappearing_seconds || ' seconds')::interval
         )
         AND to_tsvector('simple', m.content) @@ plainto_tsquery('simple', $2)
       ORDER BY rank DESC, m.created_at DESC
       LIMIT $3 OFFSET $4
    `,
    [userId, query, limit, offset],
  );
  return rows;
}
