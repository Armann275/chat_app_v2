import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

const USER_PUBLIC_COLUMNS = `
  id, username, email, avatar_url, bio, last_seen_at, created_at, updated_at
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

export async function findById(id) {
  const rows = await dataSource.query(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(rows);
}

export async function findByEmail(email) {
  const rows = await dataSource.query(
    `SELECT id, username, email, password_hash, avatar_url, bio, last_seen_at, created_at, updated_at
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
       RETURNING id, username, email, avatar_url, bio, last_seen_at, created_at, updated_at
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

export async function searchByUsername(query, { limit = 20, offset = 0 } = {}) {
  const rows = await dataSource.query(
    `
      SELECT ${USER_PUBLIC_COLUMNS}
        FROM users
       WHERE username ILIKE $1
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
