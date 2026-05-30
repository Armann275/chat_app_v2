import { body, param, query } from 'express-validator';

export const sessionIdParam = [
  param('id').isUUID().withMessage('id must be a UUID'),
];

export const listSessionsValidator = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

export const sendMessageValidator = [
  param('id').isUUID().withMessage('id must be a UUID'),
  body('content')
    .isString()
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('content must be 1-4000 characters'),
];
