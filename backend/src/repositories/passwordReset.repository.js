import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const COLUMNS = `id, user_id, code_hash, expires_at, consumed_at, attempts, created_at`;

export async function create({ userId, codeHash, expiresAt }) {
  const result = await dataSource.query(
    `
      INSERT INTO password_resets (user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING ${COLUMNS}
    `,
    [userId, codeHash, expiresAt],
  );
  return firstRow(result);
}

export async function findActiveByUserId(userId) {
  const result = await dataSource.query(
    `
      SELECT ${COLUMNS}
        FROM password_resets
       WHERE user_id = $1 AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1
    `,
    [userId],
  );
  return firstRow(result);
}

export async function markConsumed(id) {
  await dataSource.query(
    `UPDATE password_resets SET consumed_at = now() WHERE id = $1`,
    [id],
  );
}

export async function incrementAttempts(id) {
  const result = await dataSource.query(
    `UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1 RETURNING attempts`,
    [id],
  );
  return firstRow(result)?.attempts ?? 0;
}

export async function invalidateAllForUser(userId) {
  await dataSource.query(
    `
      UPDATE password_resets
         SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL
    `,
    [userId],
  );
}
