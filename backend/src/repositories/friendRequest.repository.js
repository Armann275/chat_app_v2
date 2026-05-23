import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const REQUEST_COLUMNS = `
  id, from_user_id, to_user_id, status, created_at, responded_at
`;

export async function createPending(fromUserId, toUserId) {
  const result = await dataSource.query(
    `
      INSERT INTO friend_requests (from_user_id, to_user_id, status)
      VALUES ($1, $2, 'pending')
      RETURNING ${REQUEST_COLUMNS}
    `,
    [fromUserId, toUserId],
  );
  return firstRow(result);
}

export async function findById(id) {
  const result = await dataSource.query(
    `SELECT ${REQUEST_COLUMNS} FROM friend_requests WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(result);
}

export async function findPendingBetween(fromUserId, toUserId) {
  const result = await dataSource.query(
    `
      SELECT ${REQUEST_COLUMNS}
        FROM friend_requests
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'
       LIMIT 1
    `,
    [fromUserId, toUserId],
  );
  return firstRow(result);
}

export async function setStatus(id, status) {
  const result = await dataSource.query(
    `
      UPDATE friend_requests
         SET status = $2, responded_at = now()
       WHERE id = $1
       RETURNING ${REQUEST_COLUMNS}
    `,
    [id, status],
  );
  return firstRow(result);
}

export async function listIncomingPending(toUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status,
             fr.created_at, fr.responded_at,
             u.id AS peer_id,
             u.username, u.email, u.avatar_url, u.bio, u.last_seen_at,
             u.created_at AS user_created_at, u.updated_at AS user_updated_at
        FROM friend_requests fr
        JOIN users u ON u.id = fr.from_user_id
       WHERE fr.to_user_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC
       LIMIT $2 OFFSET $3
    `,
    [toUserId, limit, offset],
  );
  return rows;
}

export async function listOutgoingPending(fromUserId, { limit = 50, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT fr.id, fr.from_user_id, fr.to_user_id, fr.status,
             fr.created_at, fr.responded_at,
             u.id AS peer_id,
             u.username, u.email, u.avatar_url, u.bio, u.last_seen_at,
             u.created_at AS user_created_at, u.updated_at AS user_updated_at
        FROM friend_requests fr
        JOIN users u ON u.id = fr.to_user_id
       WHERE fr.from_user_id = $1 AND fr.status = 'pending'
       ORDER BY fr.created_at DESC
       LIMIT $2 OFFSET $3
    `,
    [fromUserId, limit, offset],
  );
  return rows;
}
