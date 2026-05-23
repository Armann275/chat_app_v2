import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function getUserPrefs(userId) {
  const result = await dataSource.query(
    `SELECT user_id, dark_mode, notifications_enabled, updated_at FROM user_preferences WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return firstRow(result);
}

export async function upsertUserPrefs(userId, { darkMode, notificationsEnabled }) {
  const result = await dataSource.query(
    `
      INSERT INTO user_preferences (user_id, dark_mode, notifications_enabled, updated_at)
      VALUES ($1, COALESCE($2, false), COALESCE($3, true), now())
      ON CONFLICT (user_id) DO UPDATE SET
        dark_mode = COALESCE($2, user_preferences.dark_mode),
        notifications_enabled = COALESCE($3, user_preferences.notifications_enabled),
        updated_at = now()
      RETURNING user_id, dark_mode, notifications_enabled, updated_at
    `,
    [userId, darkMode ?? null, notificationsEnabled ?? null],
  );
  return firstRow(result);
}

export async function getChatPrefs(chatId, userId) {
  const result = await dataSource.query(
    `SELECT chat_id, user_id, muted_until, archived, notifications, updated_at
       FROM chat_user_preferences WHERE chat_id = $1 AND user_id = $2 LIMIT 1`,
    [chatId, userId],
  );
  return firstRow(result);
}

export async function upsertChatPrefs(chatId, userId, { mutedUntil, archived, notifications }) {
  const result = await dataSource.query(
    `
      INSERT INTO chat_user_preferences (chat_id, user_id, muted_until, archived, notifications, updated_at)
      VALUES ($1, $2, $3, COALESCE($4, false), COALESCE($5, 'default'), now())
      ON CONFLICT (chat_id, user_id) DO UPDATE SET
        muted_until = COALESCE($3, chat_user_preferences.muted_until),
        archived = COALESCE($4, chat_user_preferences.archived),
        notifications = COALESCE($5, chat_user_preferences.notifications),
        updated_at = now()
      RETURNING chat_id, user_id, muted_until, archived, notifications, updated_at
    `,
    [chatId, userId, mutedUntil ?? null, archived ?? null, notifications ?? null],
  );
  return firstRow(result);
}

export async function unmuteAndUnarchive(chatId, userId) {
  await dataSource.query(
    `UPDATE chat_user_preferences SET muted_until = NULL, updated_at = now()
       WHERE chat_id = $1 AND user_id = $2`,
    [chatId, userId],
  );
}
