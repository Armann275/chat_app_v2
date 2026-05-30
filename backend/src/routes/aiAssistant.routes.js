import { Router } from 'express';
import * as aiCtrl from '../controllers/aiAssistant.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listSessionsValidator,
  sendMessageValidator,
  sessionIdParam,
} from '../validators/aiAssistant.validator.js';

export const aiAssistantRouter = Router();

aiAssistantRouter.use(requireAuth);

aiAssistantRouter.post('/sessions', aiCtrl.createSession);
aiAssistantRouter.get(
  '/sessions',
  listSessionsValidator,
  validate,
  aiCtrl.listSessions,
);
aiAssistantRouter.get(
  '/sessions/:id',
  sessionIdParam,
  validate,
  aiCtrl.getSession,
);
aiAssistantRouter.delete(
  '/sessions/:id',
  sessionIdParam,
  validate,
  aiCtrl.deleteSession,
);
aiAssistantRouter.post(
  '/sessions/:id/messages',
  sendMessageValidator,
  validate,
  aiCtrl.sendMessage,
);
