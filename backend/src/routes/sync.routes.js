import { Router } from 'express';
import { body, query as q } from 'express-validator';
import * as syncCtrl from '../controllers/sync.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

export const syncRouter = Router();

syncRouter.use(requireAuth);

syncRouter.get(
  '/delta',
  [q('lastSyncedAt').optional().isISO8601()],
  validate, syncCtrl.delta,
);

syncRouter.post(
  '/offline-queue',
  [
    body('items').isArray({ min: 1, max: 100 }),
    body('items.*.tempId').isString().isLength({ min: 1, max: 64 }),
    body('items.*.chatId').isUUID(),
    body('items.*.content').isString().isLength({ min: 1, max: 4000 }),
    body('items.*.replyToMessageId').optional({ nullable: true }).isUUID(),
  ],
  validate, syncCtrl.offlineQueue,
);
