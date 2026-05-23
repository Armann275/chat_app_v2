import { body, query } from 'express-validator';

export const updateProfileValidator = [
  body('avatarUrl')
    .optional({ nullable: true })
    .isString()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('avatarUrl must be a valid URL')
    .isLength({ max: 1024 }),
  body('bio')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage('bio must be 500 characters or fewer'),
];

export const searchUsersValidator = [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 32 })
    .withMessage('q must be 1-32 characters'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt(),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .toInt(),
];
