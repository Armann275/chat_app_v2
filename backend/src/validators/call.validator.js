import { body, param, query } from 'express-validator';

export const initiateCallValidator = [
  param('id').isUUID(),
  body('type').isIn(['voice', 'video']).withMessage('type must be voice or video'),
];

export const callIdParam = [param('id').isUUID()];

export const listCallsValidator = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];
