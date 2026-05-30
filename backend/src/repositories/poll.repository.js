import { dataSource } from '../config/database.js';
import { firstRow, rows } from './_util.js';

const POLL_COLS = `id, chat_id, question, multi_choice, closes_at, closed_at,
                   created_by, created_at`;

export async function createPollWithOptions({
  chatId, question, multiChoice, closesAt, createdBy, options,
}) {
  return dataSource.transaction(async (manager) => {
    const pollResult = await manager.query(
      `
        INSERT INTO polls (chat_id, question, multi_choice, closes_at, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${POLL_COLS}
      `,
      [chatId, question, multiChoice, closesAt, createdBy],
    );
    const poll = firstRow(pollResult);

    const optionRows = [];
    for (let i = 0; i < options.length; i += 1) {
      const r = await manager.query(
        `
          INSERT INTO poll_options (poll_id, text, order_index)
          VALUES ($1, $2, $3)
          RETURNING id, poll_id, text, order_index
        `,
        [poll.id, options[i], i],
      );
      optionRows.push(firstRow(r));
    }
    return { poll, options: optionRows };
  });
}

export async function findById(pollId) {
  const result = await dataSource.query(
    `SELECT ${POLL_COLS} FROM polls WHERE id = $1 LIMIT 1`,
    [pollId],
  );
  return firstRow(result);
}

export async function listOptions(pollId) {
  const result = await dataSource.query(
    `SELECT id, poll_id, text, order_index
       FROM poll_options
      WHERE poll_id = $1
      ORDER BY order_index ASC`,
    [pollId],
  );
  return rows(result);
}

export async function listByChat(chatId) {
  const result = await dataSource.query(
    `SELECT ${POLL_COLS} FROM polls WHERE chat_id = $1 ORDER BY created_at DESC`,
    [chatId],
  );
  return rows(result);
}

export async function tally(pollId) {
  const result = await dataSource.query(
    `SELECT option_id, COUNT(*)::int AS votes
       FROM poll_votes
      WHERE poll_id = $1
      GROUP BY option_id`,
    [pollId],
  );
  return rows(result);
}

export async function listUserVotes(pollId, userId) {
  const result = await dataSource.query(
    `SELECT option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
    [pollId, userId],
  );
  return rows(result).map((r) => r.option_id);
}

export async function findOption(optionId) {
  const result = await dataSource.query(
    `SELECT id, poll_id, text, order_index FROM poll_options WHERE id = $1 LIMIT 1`,
    [optionId],
  );
  return firstRow(result);
}

export async function addVote({ pollId, optionId, userId, replaceForSingleChoice }) {
  return dataSource.transaction(async (manager) => {
    if (replaceForSingleChoice) {
      await manager.query(
        `DELETE FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
        [pollId, userId],
      );
    }
    await manager.query(
      `
        INSERT INTO poll_votes (poll_id, option_id, user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (poll_id, option_id, user_id) DO NOTHING
      `,
      [pollId, optionId, userId],
    );
  });
}

export async function removeVote({ pollId, optionId, userId }) {
  const result = await dataSource.query(
    `
      DELETE FROM poll_votes
       WHERE poll_id = $1 AND option_id = $2 AND user_id = $3
    `,
    [pollId, optionId, userId],
  );
  return Array.isArray(result) ? (result[1] ?? 0) : 0;
}

export async function close(pollId) {
  const result = await dataSource.query(
    `
      UPDATE polls
         SET closed_at = now()
       WHERE id = $1 AND closed_at IS NULL
       RETURNING ${POLL_COLS}
    `,
    [pollId],
  );
  return firstRow(result);
}
