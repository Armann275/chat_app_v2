import { body, param } from 'express-validator';

export const chatIdParam = [param('id').isUUID()];

export const createInviteLinkValidator = [
  param('id').isUUID(),
  body('expiresAt').optional({ nullable: true }).isISO8601(),
  body('maxUses').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];

export const linkIdParams = [
  param('id').isUUID(),
  param('linkId').isUUID(),
];

export const codeParam = [
  param('code').isString().isLength({ min: 4, max: 32 }),
];

export const joinRequestCreateValidator = [
  param('id').isUUID(),
  body('message')
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 }),
];

export const joinRequestDecisionParams = [
  param('id').isUUID(),
  param('userId').isUUID(),
];
