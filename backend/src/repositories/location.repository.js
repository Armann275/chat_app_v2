import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const FRESH_INTERVAL = `'24 hours'`;

export async function upsertLocation(userId, lat, lng) {
  const result = await dataSource.query(
    `
      INSERT INTO user_locations (user_id, latitude, longitude, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (user_id) DO UPDATE
        SET latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            updated_at = now()
      RETURNING user_id, latitude, longitude, updated_at
    `,
    [userId, lat, lng],
  );
  return firstRow(result);
}

export async function deleteLocation(userId) {
  await dataSource.query(`DELETE FROM user_locations WHERE user_id = $1`, [userId]);
}

export async function getMyLocation(userId) {
  const result = await dataSource.query(
    `SELECT user_id, latitude, longitude, updated_at
       FROM user_locations
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );
  return firstRow(result);
}

export async function getPrivacy(userId) {
  const result = await dataSource.query(
    `SELECT user_id, mode, updated_at
       FROM user_location_privacy
      WHERE user_id = $1
      LIMIT 1`,
    [userId],
  );
  return firstRow(result);
}

export async function upsertPrivacy(userId, mode) {
  const result = await dataSource.query(
    `
      INSERT INTO user_location_privacy (user_id, mode, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (user_id) DO UPDATE
        SET mode = EXCLUDED.mode,
            updated_at = now()
      RETURNING user_id, mode, updated_at
    `,
    [userId, mode],
  );
  return firstRow(result);
}

export async function listVisibleFriends(userId) {
  const result = await dataSource.query(
    `SELECT friend_user_id FROM user_location_visible_to WHERE user_id = $1`,
    [userId],
  );
  return result.map((r) => r.friend_user_id);
}

export async function replaceVisibleFriends(userId, friendIds) {
  await dataSource.query(
    `DELETE FROM user_location_visible_to WHERE user_id = $1`,
    [userId],
  );
  if (!friendIds || friendIds.length === 0) return;
  const values = friendIds.map((_, i) => `($1, $${i + 2})`).join(',');
  await dataSource.query(
    `INSERT INTO user_location_visible_to (user_id, friend_user_id) VALUES ${values}
       ON CONFLICT DO NOTHING`,
    [userId, ...friendIds],
  );
}

export async function getVisibleFriendLocations(viewerUserId) {
  const result = await dataSource.query(
    `
      SELECT u.id AS user_id,
             u.username,
             u.avatar_url,
             u.custom_photo_url,
             u.avatar_source,
             ul.latitude,
             ul.longitude,
             ul.updated_at
        FROM friendships f
        JOIN users u ON u.id = CASE
                                 WHEN f.user_a_id = $1 THEN f.user_b_id
                                 ELSE f.user_a_id
                               END
        JOIN user_locations ul ON ul.user_id = u.id
        JOIN user_location_privacy p ON p.user_id = u.id
        LEFT JOIN user_location_visible_to v
          ON v.user_id = u.id AND v.friend_user_id = $1
       WHERE (f.user_a_id = $1 OR f.user_b_id = $1)
         AND ul.updated_at > now() - interval ${FRESH_INTERVAL}
         AND (
           p.mode = 'friends'
           OR (p.mode = 'specific_friends' AND v.friend_user_id IS NOT NULL)
         )
    `,
    [viewerUserId],
  );
  return result;
}

export async function getViewersAllowedToSee(updaterUserId) {
  const result = await dataSource.query(
    `
      WITH my_privacy AS (
        SELECT mode FROM user_location_privacy WHERE user_id = $1 LIMIT 1
      ),
      my_friends AS (
        SELECT CASE
                 WHEN f.user_a_id = $1 THEN f.user_b_id
                 ELSE f.user_a_id
               END AS friend_id
          FROM friendships f
         WHERE f.user_a_id = $1 OR f.user_b_id = $1
      )
      SELECT mf.friend_id AS user_id
        FROM my_friends mf
        JOIN my_privacy p ON true
       WHERE p.mode = 'friends'
          OR (p.mode = 'specific_friends'
              AND EXISTS (
                SELECT 1 FROM user_location_visible_to v
                 WHERE v.user_id = $1 AND v.friend_user_id = mf.friend_id
              ))
    `,
    [updaterUserId],
  );
  return result.map((r) => r.user_id);
}
