import { Router } from 'express';
import { body } from 'express-validator';
import * as userCtrl from '../controllers/user.controller.js';
import * as prefsCtrl from '../controllers/preferences.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  updateProfileValidator,
  searchUsersValidator,
} from '../validators/user.validator.js';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/me', userCtrl.getMe);
userRouter.patch('/me', updateProfileValidator, validate, userCtrl.updateMe);
userRouter.get('/search', searchUsersValidator, validate, userCtrl.searchUsers);
userRouter.get('/me/preferences', prefsCtrl.getMine);
userRouter.patch(
  '/me/preferences',
  [
    body('darkMode').optional().isBoolean(),
    body('notificationsEnabled').optional().isBoolean(),
  ],
  validate, prefsCtrl.updateMine,
);
