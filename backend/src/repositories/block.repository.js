import { dataSource } from '../config/database.js';
import { firstRow, rows } from './_util.js';

export async function block(blockerId, blockedId) {
  const result = await dataSource.query(
    `
      INSERT INTO user_blocks (blocker_id, blocked_id)
      VALUES ($1, $2)
      ON CONFLICT (blocker_id, blocked_id) DO NOTHING
      RETURNING blocker_id, blocked_id, created_at
    `,
    [blockerId, blockedId],
  );
  return firstRow(result);
}

export async function unblock(blockerId, blockedId) {
  const result = await dataSource.query(
    `DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId],
  );
  return Array.isArray(result) ? (result[1] ?? 0) : 0;
}

export async function isBlocked(blockerId, blockedId) {
  const result = await dataSource.query(
    `SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
    [blockerId, blockedId],
  );
  return rows(result).length > 0;
}

export async function eitherSideBlocks(aId, bId) {
  const result = await dataSource.query(
    `
      SELECT blocker_id, blocked_id FROM user_blocks
       WHERE (blocker_id = $1 AND blocked_id = $2)
          OR (blocker_id = $2 AND blocked_id = $1)
       LIMIT 1
    `,
    [aId, bId],
  );
  return firstRow(result);
}

export async function listBlocked(blockerId) {
  const result = await dataSource.query(
    `
      SELECT ub.blocked_id, ub.created_at,
             u.username, u.email, u.avatar_url, u.bio, u.last_seen_at,
             u.created_at AS user_created_at, u.updated_at AS user_updated_at
        FROM user_blocks ub
        JOIN users u ON u.id = ub.blocked_id
       WHERE ub.blocker_id = $1
       ORDER BY ub.created_at DESC
    `,
    [blockerId],
  );
  return rows(result);
}
