import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function getByUserId(userId) {
  const rows = await dataSource.query(
    `SELECT user_id, who_can_message, updated_at
       FROM user_privacy_settings WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return firstRow(rows);
}

export async function upsert(userId, whoCanMessage) {
  const rows = await dataSource.query(
    `
      INSERT INTO user_privacy_settings (user_id, who_can_message, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (user_id) DO UPDATE
        SET who_can_message = EXCLUDED.who_can_message,
            updated_at = now()
      RETURNING user_id, who_can_message, updated_at
    `,
    [userId, whoCanMessage],
  );
  return firstRow(rows);
}
