import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function getTotpForUser(userId) {
  const result = await dataSource.query(
    `SELECT totp_secret, totp_enabled_at, totp_backup_codes
       FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  return firstRow(result);
}

export async function setTotpSecret(userId, secret) {
  await dataSource.query(
    `UPDATE users
        SET totp_secret = $2,
            totp_enabled_at = NULL,
            updated_at = now()
      WHERE id = $1`,
    [userId, secret],
  );
}

export async function enableTotp(userId, backupCodes) {
  await dataSource.query(
    `UPDATE users
        SET totp_enabled_at = now(),
            totp_backup_codes = $2::jsonb,
            updated_at = now()
      WHERE id = $1`,
    [userId, JSON.stringify(backupCodes)],
  );
}

export async function disableTotp(userId) {
  await dataSource.query(
    `UPDATE users
        SET totp_secret = NULL,
            totp_enabled_at = NULL,
            totp_backup_codes = NULL,
            updated_at = now()
      WHERE id = $1`,
    [userId],
  );
}

export async function replaceBackupCodes(userId, codes) {
  await dataSource.query(
    `UPDATE users SET totp_backup_codes = $2::jsonb WHERE id = $1`,
    [userId, JSON.stringify(codes)],
  );
}

export async function createChallenge({ userId, tokenHash, expiresAt }) {
  const result = await dataSource.query(
    `
      INSERT INTO two_factor_challenges (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, token_hash, expires_at, consumed_at, created_at
    `,
    [userId, tokenHash, expiresAt],
  );
  return firstRow(result);
}

export async function findChallengeByHash(tokenHash) {
  const result = await dataSource.query(
    `
      SELECT id, user_id, token_hash, expires_at, consumed_at, created_at
        FROM two_factor_challenges
       WHERE token_hash = $1
       LIMIT 1
    `,
    [tokenHash],
  );
  return firstRow(result);
}

export async function consumeChallenge(id) {
  await dataSource.query(
    `UPDATE two_factor_challenges SET consumed_at = now() WHERE id = $1`,
    [id],
  );
}
