import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function createChat({
  type,
  name,
  createdBy,
  status = 'active',
  requestedByUserId = null,
  requestTargetUserId = null,
  description = null,
  joinMode = 'invite_only',
}) {
  const result = await dataSource.query(
    `
      INSERT INTO chats (type, name, description, join_mode, created_by,
                         status, requested_by_user_id, request_target_user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, type, name, description, join_mode, disappearing_seconds, created_by, status,
                requested_by_user_id, request_target_user_id, created_at
    `,
    [
      type,
      name ?? null,
      description,
      joinMode,
      createdBy,
      status,
      requestedByUserId,
      requestTargetUserId,
    ],
  );
  return firstRow(result);
}

export async function updateChatInfo(chatId, { name, description }) {
  const result = await dataSource.query(
    `
      UPDATE chats
         SET name = COALESCE($2, name),
             description = COALESCE($3, description)
       WHERE id = $1
       RETURNING id, type, name, description, join_mode, disappearing_seconds, created_by, status,
                 requested_by_user_id, request_target_user_id, created_at
    `,
    [chatId, name ?? null, description ?? null],
  );
  return firstRow(result);
}

export async function setDisappearingSeconds(chatId, disappearingSeconds) {
  const result = await dataSource.query(
    `
      UPDATE chats
         SET disappearing_seconds = $2
       WHERE id = $1
       RETURNING id, type, name, description, join_mode, disappearing_seconds, created_by, status,
                 requested_by_user_id, request_target_user_id, created_at
    `,
    [chatId, disappearingSeconds],
  );
  return firstRow(result);
}

export async function setMemberRole(chatId, userId, role) {
  const result = await dataSource.query(
    `
      UPDATE chat_members
         SET role = $3
       WHERE chat_id = $1 AND user_id = $2
       RETURNING chat_id, user_id, role, joined_at
    `,
    [chatId, userId, role],
  );
  return firstRow(result);
}

export async function countAdmins(chatId) {
  const rows = await dataSource.query(
    `SELECT COUNT(*)::int AS n FROM chat_members WHERE chat_id = $1 AND role = 'admin'`,
    [chatId],
  );
  return rows[0]?.n ?? 0;
}

export async function setChatStatus(chatId, status) {
  const result = await dataSource.query(
    `
      UPDATE chats
         SET status = $2
       WHERE id = $1
       RETURNING id, type, name, description, join_mode, disappearing_seconds, created_by, status,
                 requested_by_user_id, request_target_user_id, created_at
    `,
    [chatId, status],
  );
  return firstRow(result);
}

export async function deleteChat(chatId) {
  const result = await dataSource.query(
    `DELETE FROM chats WHERE id = $1`,
    [chatId],
  );
  return Array.isArray(result) ? (result[1] ?? 0) : 0;
}

export async function clearChatForUser(chatId, userId) {
  await dataSource.query(
    `
      INSERT INTO chat_clears (chat_id, user_id, cleared_at)
      VALUES ($1, $2, now())
      ON CONFLICT (chat_id, user_id) DO UPDATE SET cleared_at = now()
    `,
    [chatId, userId],
  );
}

export async function addMember({ chatId, userId, role = 'member' }) {
  const result = await dataSource.query(
    `
      INSERT INTO chat_members (chat_id, user_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (chat_id, user_id) DO NOTHING
      RETURNING chat_id, user_id, role, joined_at
    `,
    [chatId, userId, role],
  );
  return firstRow(result);
}

export async function removeMember(chatId, userId) {
  const result = await dataSource.query(
    `DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId],
  );
  return Array.isArray(result) ? (result[1] ?? 0) : 0;
}

export async function getChatById(id) {
  const result = await dataSource.query(
    `SELECT id, type, name, description, join_mode, disappearing_seconds, created_by, status,
            requested_by_user_id, request_target_user_id, created_at
       FROM chats WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(result);
}

export async function getMembers(chatId) {
  const rows = await dataSource.query(
    `
      SELECT cm.chat_id, cm.user_id, cm.role, cm.joined_at,
             u.username, u.email, u.avatar_url, u.bio, u.last_seen_at,
             u.created_at AS user_created_at, u.updated_at AS user_updated_at
        FROM chat_members cm
        JOIN users u ON u.id = cm.user_id
       WHERE cm.chat_id = $1
       ORDER BY cm.joined_at ASC
    `,
    [chatId],
  );
  return rows;
}

export async function getMembership(chatId, userId) {
  const result = await dataSource.query(
    `
      SELECT chat_id, user_id, role, joined_at
        FROM chat_members
       WHERE chat_id = $1 AND user_id = $2
       LIMIT 1
    `,
    [chatId, userId],
  );
  return firstRow(result);
}

export async function getUserChats(userId, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT c.id, c.type, c.name, c.description, c.join_mode, c.disappearing_seconds,
             c.created_by, c.created_at,
             c.status, c.requested_by_user_id, c.request_target_user_id,
             cm.role AS my_role, cm.joined_at AS my_joined_at,
             other_u.id AS other_user_id,
             other_u.username AS other_username,
             other_u.email AS other_email,
             other_u.avatar_url AS other_avatar_url,
             other_u.bio AS other_bio,
             other_u.last_seen_at AS other_last_seen_at,
             other_u.created_at AS other_created_at,
             other_u.updated_at AS other_updated_at,
             cup.archived AS my_archived,
             cup.muted_until AS my_muted_until,
             lm.id          AS last_message_id,
             lm.sender_id   AS last_message_sender_id,
             lm.sender_username AS last_message_sender_username,
             lm.content     AS last_message_content,
             lm.created_at  AS last_message_at,
             lm.deleted_at  AS last_message_deleted_at,
             lm.attachment_kind AS last_message_attachment_kind,
             COALESCE(uc.unread, 0)::int AS unread_count
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1
        LEFT JOIN chat_members other_cm
          ON other_cm.chat_id = c.id
         AND other_cm.user_id <> $1
         AND c.type = 'direct'
        LEFT JOIN users other_u ON other_u.id = other_cm.user_id
        LEFT JOIN chat_user_preferences cup
          ON cup.chat_id = c.id AND cup.user_id = $1
        LEFT JOIN chat_clears cc
          ON cc.chat_id = c.id AND cc.user_id = $1
        LEFT JOIN LATERAL (
          SELECT m.id, m.sender_id, u.username AS sender_username,
                 m.content, m.created_at, m.deleted_at,
                 (SELECT a.kind FROM attachments a
                   WHERE a.message_id = m.id
                   ORDER BY a.created_at LIMIT 1) AS attachment_kind
            FROM messages m
            LEFT JOIN users u ON u.id = m.sender_id
           WHERE m.chat_id = c.id
             AND m.thread_root_id IS NULL
             AND NOT EXISTS (
               SELECT 1 FROM message_deletions md
                WHERE md.message_id = m.id AND md.user_id = $1
             )
             AND (cc.cleared_at IS NULL OR m.created_at > cc.cleared_at)
             AND (
               c.disappearing_seconds IS NULL
               OR m.created_at > now() - (c.disappearing_seconds || ' seconds')::interval
             )
           ORDER BY m.created_at DESC
           LIMIT 1
        ) lm ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS unread
            FROM messages m
            LEFT JOIN message_receipts r
              ON r.message_id = m.id AND r.user_id = $1
           WHERE m.chat_id = c.id
             AND m.sender_id <> $1
             AND m.deleted_at IS NULL
             AND r.seen_at IS NULL
             AND (cc.cleared_at IS NULL OR m.created_at > cc.cleared_at)
             AND (
               c.disappearing_seconds IS NULL
               OR m.created_at > now() - (c.disappearing_seconds || ' seconds')::interval
             )
        ) uc ON true
       WHERE (
               c.status = 'active'
               OR (c.status = 'request' AND c.requested_by_user_id = $1)
             )
         -- Hide chats the user cleared "for me" until a newer message arrives.
         AND (cc.cleared_at IS NULL OR lm.id IS NOT NULL)
       ORDER BY COALESCE(lm.created_at, c.created_at) DESC
       LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return rows;
}

export async function getAllChatsForUserIncludingRequests(
  userId,
  { limit = 1000, offset = 0 } = {},
) {
  const rows = await dataSource.query(
    `
      SELECT c.id, c.status
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return rows;
}

export async function getRequestChatsForUser(userId, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT c.id, c.type, c.name, c.description, c.join_mode, c.disappearing_seconds,
             c.created_by, c.created_at,
             c.status, c.requested_by_user_id, c.request_target_user_id,
             cm.role AS my_role, cm.joined_at AS my_joined_at,
             other_u.id AS other_user_id,
             other_u.username AS other_username,
             other_u.email AS other_email,
             other_u.avatar_url AS other_avatar_url,
             other_u.bio AS other_bio,
             other_u.last_seen_at AS other_last_seen_at,
             other_u.created_at AS other_created_at,
             other_u.updated_at AS other_updated_at
        FROM chats c
        JOIN chat_members cm ON cm.chat_id = c.id AND cm.user_id = $1
        LEFT JOIN users other_u ON other_u.id = c.requested_by_user_id
       WHERE c.status = 'request' AND c.request_target_user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return rows;
}

export async function findDirectChatBetween(userIdA, userIdB) {
  const result = await dataSource.query(
    `
      SELECT c.id, c.type, c.name, c.description, c.join_mode, c.disappearing_seconds,
             c.created_by, c.status,
             c.requested_by_user_id, c.request_target_user_id, c.created_at
        FROM chats c
        JOIN chat_members m1 ON m1.chat_id = c.id AND m1.user_id = $1
        JOIN chat_members m2 ON m2.chat_id = c.id AND m2.user_id = $2
       WHERE c.type = 'direct'
       LIMIT 1
    `,
    [userIdA, userIdB],
  );
  return firstRow(result);
}
