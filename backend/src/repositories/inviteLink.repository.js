import { dataSource } from '../config/database.js';
import { firstRow, rows } from './_util.js';

const SELECT_COLS = `id, chat_id, code, created_by, expires_at, max_uses, uses,
                     revoked_at, created_at`;

export async function create({ chatId, code, createdBy, expiresAt = null, maxUses = null }) {
  const result = await dataSource.query(
    `
      INSERT INTO chat_invite_links (chat_id, code, created_by, expires_at, max_uses)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING ${SELECT_COLS}
    `,
    [chatId, code, createdBy, expiresAt, maxUses],
  );
  return firstRow(result);
}

export async function findByCode(code) {
  const result = await dataSource.query(
    `SELECT ${SELECT_COLS} FROM chat_invite_links WHERE code = $1 LIMIT 1`,
    [code],
  );
  return firstRow(result);
}

export async function findById(id) {
  const result = await dataSource.query(
    `SELECT ${SELECT_COLS} FROM chat_invite_links WHERE id = $1 LIMIT 1`,
    [id],
  );
  return firstRow(result);
}

export async function listByChat(chatId) {
  const result = await dataSource.query(
    `SELECT ${SELECT_COLS}
       FROM chat_invite_links
      WHERE chat_id = $1
      ORDER BY created_at DESC`,
    [chatId],
  );
  return rows(result);
}

export async function revoke(id) {
  const result = await dataSource.query(
    `
      UPDATE chat_invite_links
         SET revoked_at = now()
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING ${SELECT_COLS}
    `,
    [id],
  );
  return firstRow(result);
}

export async function incrementUses(id) {
  const result = await dataSource.query(
    `
      UPDATE chat_invite_links
         SET uses = uses + 1
       WHERE id = $1
       RETURNING ${SELECT_COLS}
    `,
    [id],
  );
  return firstRow(result);
}
