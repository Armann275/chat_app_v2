import { body, param, query } from 'express-validator';

export const createDirectChatValidator = [
  body('userId').isUUID().withMessage('userId must be a UUID'),
];

export const createGroupChatValidator = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('name must be 1-100 characters'),
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('memberIds must be a non-empty array'),
  body('memberIds.*').isUUID().withMessage('memberIds must contain UUIDs'),
];

export const addMembersValidator = [
  param('id').isUUID(),
  body('memberIds').isArray({ min: 1 }),
  body('memberIds.*').isUUID(),
];

export const chatIdParam = [param('id').isUUID()];

export const chatIdAndUserIdParams = [
  param('id').isUUID(),
  param('userId').isUUID(),
];

export const listChatsValidator = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];
