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
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('description must be at most 1000 characters'),
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('memberIds must be a non-empty array'),
  body('memberIds.*').isUUID().withMessage('memberIds must contain UUIDs'),
];

export const createChannelValidator = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('name must be 1-100 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 }),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('memberIds must be an array'),
  body('memberIds.*').optional().isUUID(),
];

export const updateGroupValidator = [
  param('id').isUUID(),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('name must be 1-100 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 })
    .withMessage('description must be at most 1000 characters'),
];

export const setMemberRoleValidator = [
  param('id').isUUID(),
  param('userId').isUUID(),
  body('role')
    .isIn(['member', 'moderator', 'admin'])
    .withMessage('role must be one of: member, moderator, admin'),
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
