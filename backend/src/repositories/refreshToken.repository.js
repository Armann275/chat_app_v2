import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function create({ userId, tokenHash, expiresAt }) {
  const result = await dataSource.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token_hash, expires_at, revoked_at, created_at
    `,
    [userId, tokenHash, expiresAt],
  );
  return firstRow(result);
}

export async function findByHash(tokenHash) {
  const result = await dataSource.query(
    `
      SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
        FROM refresh_tokens
       WHERE token_hash = $1
       LIMIT 1
    `,
    [tokenHash],
  );
  return firstRow(result);
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
