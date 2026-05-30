import { body, param } from 'express-validator';

export const userIdParam = [param('id').isUUID()];

export const reportValidator = [
  param('id').isUUID(),
  body('reason')
    .isIn(['spam', 'harassment', 'hate_speech', 'impersonation', 'self_harm', 'other']),
  body('details')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 1000 }),
];
