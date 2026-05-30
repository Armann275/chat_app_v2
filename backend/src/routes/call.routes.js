import { Router } from 'express';
import * as ctrl from '../controllers/call.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  initiateCallValidator,
  callIdParam,
  listCallsValidator,
} from '../validators/call.validator.js';

// Mounted under /chats/:id
export const chatCallRouter = Router({ mergeParams: true });
chatCallRouter.use(requireAuth);
chatCallRouter.post('/calls', initiateCallValidator, validate, ctrl.initiate);

// Mounted under /calls
export const callRouter = Router();
callRouter.use(requireAuth);
callRouter.post('/:id/accept', callIdParam, validate, ctrl.accept);
callRouter.post('/:id/reject', callIdParam, validate, ctrl.reject);
callRouter.post('/:id/hangup', callIdParam, validate, ctrl.hangup);

// Mounted under /me/calls
export const meCallRouter = Router();
meCallRouter.use(requireAuth);
meCallRouter.get('/', listCallsValidator, validate, ctrl.listHistory);
