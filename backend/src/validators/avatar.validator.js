import { body } from 'express-validator';
import { DICEBEAR_STYLES } from '../services/avatar.service.js';

export const generatedAvatarValidator = [
  body('style')
    .isString()
    .isIn(DICEBEAR_STYLES)
    .withMessage(`style must be one of: ${DICEBEAR_STYLES.join(', ')}`),
  body('seed')
    .isString()
    .trim()
    .isLength({ min: 1, max: 64 })
    .withMessage('seed must be 1-64 characters'),
];
