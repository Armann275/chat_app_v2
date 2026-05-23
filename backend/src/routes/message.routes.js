import { Router } from 'express';
import { param, query as q, body } from 'express-validator';
import * as messageCtrl from '../controllers/message.controller.js';
import * as reactionCtrl from '../controllers/reaction.controller.js';
import * as pinCtrl from '../controllers/pin.controller.js';
import * as starCtrl from '../controllers/star.controller.js';
import * as draftCtrl from '../controllers/draft.controller.js';
import * as forwardCtrl from '../controllers/forward.controller.js';
import * as prefsCtrl from '../controllers/preferences.controller.js';
import * as syncCtrl from '../controllers/sync.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { messageSendLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  sendMessageValidator,
  listMessagesValidator,
  markSeenValidator,
  searchMessagesValidator,
  editMessageValidator,
  deleteMessageValidator,
} from '../validators/message.validator.js';
import {
  addReactionValidator,
  removeReactionValidator,
  listReactionsValidator,
} from '../validators/reaction.validator.js';

export const chatMessageRouter = Router({ mergeParams: true });
chatMessageRouter.use(requireAuth);

chatMessageRouter.post('/', messageSendLimiter, sendMessageValidator, validate, messageCtrl.send);
chatMessageRouter.get('/', listMessagesValidator, validate, messageCtrl.list);
chatMessageRouter.post('/:msgId/seen', markSeenValidator, validate, messageCtrl.markSeen);
chatMessageRouter.patch('/:msgId', editMessageValidator, validate, messageCtrl.edit);
chatMessageRouter.delete('/:msgId', deleteMessageValidator, validate, messageCtrl.remove);

chatMessageRouter.get('/:msgId/reactions', listReactionsValidator, validate, reactionCtrl.list);
chatMessageRouter.post('/:msgId/reactions', addReactionValidator, validate, reactionCtrl.add);
chatMessageRouter.delete('/:msgId/reactions/:emoji', removeReactionValidator, validate, reactionCtrl.remove);

chatMessageRouter.get(
  '/:msgId/thread',
  [param('id').isUUID(), param('msgId').isUUID(),
   q('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
   q('offset').optional().isInt({ min: 0 }).toInt()],
  validate, messageCtrl.thread,
);

chatMessageRouter.post(
  '/:msgId/pin',
  [param('id').isUUID(), param('msgId').isUUID()], validate, pinCtrl.pin,
);
chatMessageRouter.delete(
  '/:msgId/pin',
  [param('id').isUUID(), param('msgId').isUUID()], validate, pinCtrl.unpin,
);

export const chatRootRouter = Router({ mergeParams: true });
chatRootRouter.use(requireAuth);
chatRootRouter.get('/pins', [param('id').isUUID()], validate, pinCtrl.list);

chatRootRouter.get('/draft', [param('id').isUUID()], validate, draftCtrl.get);
chatRootRouter.put(
  '/draft',
  [param('id').isUUID(), body('content').isString().isLength({ max: 4000 })],
  validate, draftCtrl.save,
);
chatRootRouter.delete('/draft', [param('id').isUUID()], validate, draftCtrl.clear);

chatRootRouter.get('/preferences', [param('id').isUUID()], validate, prefsCtrl.getChat);

chatRootRouter.get('/read-cursor', [param('id').isUUID()], validate, syncCtrl.getReadCursor);
chatRootRouter.put(
  '/read-cursor',
  [param('id').isUUID(), body('lastReadMessageId').optional({ nullable: true }).isUUID()],
  validate, syncCtrl.setReadCursor,
);
chatRootRouter.patch(
  '/preferences',
  [
    param('id').isUUID(),
    body('mutedUntil').optional({ nullable: true }).isISO8601(),
    body('archived').optional().isBoolean(),
    body('notifications').optional().isIn(['default', 'all', 'mentions', 'none']),
  ],
  validate, prefsCtrl.updateChat,
);

export const messageRouter = Router();
messageRouter.use(requireAuth);

messageRouter.get('/search', searchMessagesValidator, validate, messageCtrl.search);
messageRouter.get('/unread-counts', messageCtrl.unreadCounts);
messageRouter.get(
  '/starred',
  [q('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
   q('offset').optional().isInt({ min: 0 }).toInt()],
  validate, starCtrl.list,
);
messageRouter.post('/:msgId/star', [param('msgId').isUUID()], validate, starCtrl.star);
messageRouter.delete('/:msgId/star', [param('msgId').isUUID()], validate, starCtrl.unstar);

messageRouter.post(
  '/forward',
  [
    body('messageIds').isArray({ min: 1, max: 100 }),
    body('messageIds.*').isUUID(),
    body('toChatIds').isArray({ min: 1, max: 50 }),
    body('toChatIds.*').isUUID(),
  ],
  validate, forwardCtrl.forward,
);
