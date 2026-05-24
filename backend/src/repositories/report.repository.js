import { dataSource } from '../config/database.js';
import { firstRow } from './_util.js';

export async function create({ reporterId, reportedId, reason, details = null }) {
  const result = await dataSource.query(
    `
      INSERT INTO user_reports (reporter_id, reported_id, reason, details)
      VALUES ($1, $2, $3, $4)
      RETURNING id, reporter_id, reported_id, reason, details, created_at, resolved_at
    `,
    [reporterId, reportedId, reason, details],
  );
  return firstRow(result);
}

export async function findRecentForPair(reporterId, reportedId, sinceIso) {
  const result = await dataSource.query(
    `
      SELECT id FROM user_reports
       WHERE reporter_id = $1 AND reported_id = $2 AND created_at >= $3
       LIMIT 1
    `,
    [reporterId, reportedId, sinceIso],
  );
  return firstRow(result);
}
