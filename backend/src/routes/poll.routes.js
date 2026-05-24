import { Router } from 'express';
import * as ctrl from '../controllers/poll.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createPollValidator,
  chatIdParam,
  pollIdParam,
  pollAndOptionParams,
} from '../validators/poll.validator.js';

// Mounted under /chats/:id
export const chatPollRouter = Router({ mergeParams: true });
chatPollRouter.use(requireAuth);

chatPollRouter.post('/polls', createPollValidator, validate, ctrl.createPoll);
chatPollRouter.get('/polls', chatIdParam, validate, ctrl.listForChat);

// Mounted under /polls
export const pollRouter = Router();
pollRouter.use(requireAuth);

pollRouter.get('/:pollId', pollIdParam, validate, ctrl.getPoll);
pollRouter.post(
  '/:pollId/options/:optionId/vote',
  pollAndOptionParams, validate, ctrl.vote,
);
pollRouter.delete(
  '/:pollId/options/:optionId/vote',
  pollAndOptionParams, validate, ctrl.unvote,
);
pollRouter.post('/:pollId/close', pollIdParam, validate, ctrl.closePoll);
