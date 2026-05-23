import { body, param } from 'express-validator';

export const addReactionValidator = [
  param('id').isUUID(),
  param('msgId').isUUID(),
  body('emoji')
    .isString()
    .isLength({ min: 1, max: 32 })
    .withMessage('emoji must be 1-32 characters'),
];

export const removeReactionValidator = [
  param('id').isUUID(),
  param('msgId').isUUID(),
  param('emoji').isString().isLength({ min: 1, max: 32 }),
];

export const listReactionsValidator = [
  param('id').isUUID(),
  param('msgId').isUUID(),
];
