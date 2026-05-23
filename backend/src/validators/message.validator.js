import { body, param, query } from 'express-validator';

export const sendMessageValidator = [
  param('id').isUUID().withMessage('chat id must be a UUID'),
  body('content')
    .isString()
    .trim()
    .isLength({ max: 4000 })
    .withMessage('content must be at most 4000 characters'),
  body('replyToMessageId').optional({ nullable: true }).isUUID(),
  body('asThreadReply').optional().isBoolean(),
  body('attachmentIds').optional().isArray({ max: 10 }),
  body('attachmentIds.*').optional().isUUID(),
  body().custom((value) => {
    const hasContent = typeof value.content === 'string' && value.content.trim().length > 0;
    const hasAttachments = Array.isArray(value.attachmentIds) && value.attachmentIds.length > 0;
    if (!hasContent && !hasAttachments) {
      throw new Error('Message must have content or at least one attachment');
    }
    return true;
  }),
];

export const listMessagesValidator = [
  param('id').isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

export const markSeenValidator = [
  param('id').isUUID(),
  param('msgId').isUUID(),
];

export const editMessageValidator = [
  param('id').isUUID(),
  param('msgId').isUUID(),
  body('content')
    .isString()
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('content must be 1-4000 characters'),
];

export const deleteMessageValidator = [
  param('id').isUUID(),
  param('msgId').isUUID(),
  query('mode')
    .optional()
    .isIn(['for_me', 'for_everyone'])
    .withMessage('mode must be for_me or for_everyone'),
];

export const searchMessagesValidator = [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('q must be 1-100 characters'),
  query('chatId').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];
