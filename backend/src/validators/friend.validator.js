import { body, param, query } from 'express-validator';

export const sendRequestValidator = [
  body('toUserId').isUUID().withMessage('toUserId must be a UUID'),
];

export const requestIdParam = [param('id').isUUID()];

export const userIdParam = [param('userId').isUUID()];

export const listRequestsValidator = [
  query('direction').optional().isIn(['incoming', 'outgoing']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

export const listFriendsValidator = [
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];
