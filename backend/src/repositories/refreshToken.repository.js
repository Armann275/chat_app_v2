import { dataSource } from '../config/database.js';
import { firstRow, rows } from './_util.js';

const SELECT_COLS = `id, user_id, token_hash, expires_at, revoked_at, created_at,
                     user_agent, ip, last_used_at`;

export async function create({
  userId, tokenHash, expiresAt, userAgent = null, ip = null,
}) {
  const result = await dataSource.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip, last_used_at)
      VALUES ($1, $2, $3, $4, $5, now())
      RETURNING ${SELECT_COLS}
    `,
    [userId, tokenHash, expiresAt, userAgent, ip],
  );
  return firstRow(result);
}

export async function findByHash(tokenHash) {
  const result = await dataSource.query(
    `SELECT ${SELECT_COLS} FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash],
  );
  return firstRow(result);
}

export async function findById(id) {
  const result = await dataSource.query(
    `SELECT ${SELECT_COLS} FROM refresh_tokens WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(result);
}

export async function touch(id) {
  await dataSource.query(
    `UPDATE refresh_tokens SET last_used_at = now() WHERE id = $1`,
    [id],
  );
}

export async function listActiveForUser(userId) {
  const result = await dataSource.query(
    `
      SELECT ${SELECT_COLS}
        FROM refresh_tokens
       WHERE user_id = $1
         AND revoked_at IS NULL
         AND expires_at > now()
       ORDER BY last_used_at DESC NULLS LAST, created_at DESC
    `,
    [userId],
  );
  return rows(result);
}

export async function revokeAllExceptId(userId, exceptId) {
  await dataSource.query(
    `
      UPDATE refresh_tokens SET revoked_at = now()
       WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL
    `,
    [userId, exceptId],
  );
}

export async function revoke(id) {
  await dataSource.query(
    `UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
    [id],
  );
}

export async function revokeAllForUser(userId) {
  await dataSource.query(
    `UPDATE refresh_tokens SET revoked_at = now()
       WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}
