import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const USER_PUBLIC_COLUMNS = `
  id, username, email, avatar_url, bio, last_seen_at, email_verified_at,
  custom_photo_url, avatar_glb_url, avatar_source,
  created_at, updated_at
`;

export async function createUser({ username, email, passwordHash }) {
  const rows = await dataSource.query(
    `
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING ${USER_PUBLIC_COLUMNS}
    `,
    [username, email, passwordHash],
  );
  return firstRow(rows);
}

export async function replaceUnverifiedCredentials(id, { username, passwordHash }) {
  const rows = await dataSource.query(
    `
      UPDATE users
         SET username      = $2,
             password_hash = $3,
             updated_at    = now()
       WHERE id = $1
         AND email_verified_at IS NULL
       RETURNING ${USER_PUBLIC_COLUMNS}
    `,
    [id, username, passwordHash],
  );
  return firstRow(rows);
}

export async function findById(id) {
  const rows = await dataSource.query(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(rows);
}

export async function findByEmail(email) {
  const rows = await dataSource.query(
    `SELECT id, username, email, password_hash, avatar_url, bio, last_seen_at,
            email_verified_at, custom_photo_url, avatar_glb_url, avatar_source,
            created_at, updated_at
       FROM users WHERE email = $1 LIMIT 1`,
    [email],
  );
  return firstRow(rows);
}

export async function updateProfile(id, { avatarUrl, bio }) {
  const rows = await dataSource.query(
    `
      UPDATE users
         SET avatar_url = COALESCE($2, avatar_url),
             bio        = COALESCE($3, bio),
             updated_at = now()
       WHERE id = $1
       RETURNING ${USER_PUBLIC_COLUMNS}
    `,
    [id, avatarUrl ?? null, bio ?? null],
  );
  return firstRow(rows);
}

export async function updateLastSeen(id) {
  await dataSource.query(
    `UPDATE users SET last_seen_at = now() WHERE id = $1`,
    [id],
  );
}

export async function markEmailVerified(id) {
  const rows = await dataSource.query(
    `
      UPDATE users
         SET email_verified_at = now(),
             updated_at = now()
       WHERE id = $1
       RETURNING ${USER_PUBLIC_COLUMNS}
    `,
    [id],
  );
  return firstRow(rows);
}

export async function setGeneratedAvatar(id, { avatarUrl, glbUrl }) {
  const rows = await dataSource.query(
    `
      UPDATE users
         SET avatar_url    = $2,
             avatar_glb_url = $3,
             avatar_source = 'generated',
             updated_at    = now()
       WHERE id = $1
       RETURNING ${USER_PUBLIC_COLUMNS}
    `,
    [id, avatarUrl, glbUrl ?? null],
  );
  return firstRow(rows);
}

export async function setCustomPhoto(id, photoUrl) {
  const rows = await dataSource.query(
    `
      UPDATE users
         SET custom_photo_url = $2,
             avatar_source    = 'custom',
             updated_at       = now()
       WHERE id = $1
       RETURNING ${USER_PUBLIC_COLUMNS}
    `,
    [id, photoUrl],
  );
  return firstRow(rows);
}

export async function clearCustomPhoto(id) {
  const rows = await dataSource.query(
    `
      UPDATE users
         SET custom_photo_url = NULL,
             avatar_source    = CASE WHEN avatar_url IS NOT NULL THEN 'generated' ELSE 'initials' END,
             updated_at       = now()
       WHERE id = $1
       RETURNING ${USER_PUBLIC_COLUMNS}
    `,
    [id],
  );
  return firstRow(rows);
}

export async function searchByUsername(query, { limit = 20, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT ${USER_PUBLIC_COLUMNS}
        FROM users
       WHERE username ILIKE $1
         AND email_verified_at IS NOT NULL
       ORDER BY username ASC
       LIMIT $2 OFFSET $3
    `,
    [`${query}%`, limit, offset],
  );
  return rows;
}

export async function findByUsername(username) {
  const rows = await dataSource.query(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE username = $1 LIMIT 1`,
    [username],
  );
  return firstRow(rows);
}
