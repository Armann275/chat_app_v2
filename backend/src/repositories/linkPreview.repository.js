import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function get(url) {
  const result = await dataSource.query(
    `SELECT url, title, description, image_url, fetched_at FROM link_previews WHERE url = $1 LIMIT 1`,
    [url],
  );
  return firstRow(result);
}

export async function upsert({ url, title, description, imageUrl }) {
  const result = await dataSource.query(
    `
      INSERT INTO link_previews (url, title, description, image_url, fetched_at)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        fetched_at = now()
      RETURNING url, title, description, image_url, fetched_at
    `,
    [url, title ?? null, description ?? null, imageUrl ?? null],
  );
  return firstRow(result);
}
