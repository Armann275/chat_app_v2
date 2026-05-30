import { body, param } from 'express-validator';

export const createPollValidator = [
  param('id').isUUID(),
  body('question').isString().trim().isLength({ min: 1, max: 500 }),
  body('options')
    .isArray({ min: 2, max: 12 })
    .withMessage('options must be 2-12 items'),
  body('options.*').isString().trim().isLength({ min: 1, max: 200 }),
  body('multiChoice').optional().isBoolean().toBoolean(),
  body('closesAt').optional({ nullable: true }).isISO8601(),
];

export const chatIdParam = [param('id').isUUID()];

export const pollIdParam = [param('pollId').isUUID()];

export const pollAndOptionParams = [
  param('pollId').isUUID(),
  param('optionId').isUUID(),
];
