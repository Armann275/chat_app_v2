import { Router } from 'express';
import * as ctrl from '../controllers/block.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { userIdParam, reportValidator } from '../validators/block.validator.js';

// Mounted under /users/:id
export const userBlockRouter = Router({ mergeParams: true });
userBlockRouter.use(requireAuth);
userBlockRouter.post('/block', userIdParam, validate, ctrl.block);
userBlockRouter.delete('/block', userIdParam, validate, ctrl.unblock);
userBlockRouter.post('/report', reportValidator, validate, ctrl.report);

// Mounted under /me
export const meBlockRouter = Router();
meBlockRouter.use(requireAuth);
meBlockRouter.get('/blocks', ctrl.listBlocked);
