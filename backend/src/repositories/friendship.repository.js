import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

function canonicalize(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function create(userId1, userId2) {
  const [a, b] = canonicalize(userId1, userId2);
  const result = await dataSource.query(
    `
      INSERT INTO friendships (user_a_id, user_b_id)
      VALUES ($1, $2)
      ON CONFLICT (user_a_id, user_b_id) DO NOTHING
      RETURNING user_a_id, user_b_id, created_at
    `,
    [a, b],
  );
  return firstRow(result);
}

export async function exists(userId1, userId2) {
  const [a, b] = canonicalize(userId1, userId2);
  const result = await dataSource.query(
    `SELECT 1 FROM friendships WHERE user_a_id = $1 AND user_b_id = $2 LIMIT 1`,
    [a, b],
  );
  return Boolean(firstRow(result));
}

export async function remove(userId1, userId2) {
  const [a, b] = canonicalize(userId1, userId2);
  const result = await dataSource.query(
    `DELETE FROM friendships WHERE user_a_id = $1 AND user_b_id = $2`,
    [a, b],
  );
  return Array.isArray(result) ? (result[1] ?? 0) : 0;
}

export async function listFriendsOf(userId, { limit = 100, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT u.id, u.username, u.email, u.avatar_url, u.bio,
             u.last_seen_at, u.custom_photo_url, u.avatar_glb_url, u.avatar_source,
             u.email_verified_at, u.created_at, u.updated_at,
             f.created_at AS friendship_created_at
        FROM friendships f
        JOIN users u
          ON u.id = CASE
                      WHEN f.user_a_id = $1 THEN f.user_b_id
                      ELSE f.user_a_id
                    END
       WHERE f.user_a_id = $1 OR f.user_b_id = $1
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset],
  );
  return rows;
}
