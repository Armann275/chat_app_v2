import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const SELECT_COLS = `user_id, who_can_message, last_seen_visibility, profile_photo_visibility, updated_at`;

export async function getByUserId(userId) {
  const rows = await dataSource.query(
    `SELECT ${SELECT_COLS}
       FROM user_privacy_settings WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  return firstRow(rows);
}

export async function upsert(userId, fields) {
  const rows = await dataSource.query(
    `
      INSERT INTO user_privacy_settings (
        user_id, who_can_message, last_seen_visibility, profile_photo_visibility, updated_at
      )
      VALUES ($1,
              COALESCE($2, 'everyone'),
              COALESCE($3, 'everyone'),
              COALESCE($4, 'everyone'),
              now())
      ON CONFLICT (user_id) DO UPDATE
        SET who_can_message = COALESCE($2, user_privacy_settings.who_can_message),
            last_seen_visibility = COALESCE($3, user_privacy_settings.last_seen_visibility),
            profile_photo_visibility = COALESCE($4, user_privacy_settings.profile_photo_visibility),
            updated_at = now()
      RETURNING ${SELECT_COLS}
    `,
    [
      userId,
      fields.whoCanMessage ?? null,
      fields.lastSeenVisibility ?? null,
      fields.profilePhotoVisibility ?? null,
    ],
  );
  return firstRow(rows);
}
