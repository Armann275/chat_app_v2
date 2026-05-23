import { Router } from 'express';
import * as avatarCtrl from '../controllers/avatar.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { generatedAvatarValidator } from '../validators/avatar.validator.js';

export const avatarRouter = Router();
avatarRouter.use(requireAuth);

avatarRouter.post(
  '/generated',
  generatedAvatarValidator,
  validate,
  avatarCtrl.setGenerated,
);
avatarRouter.post('/custom', uploadSingle, avatarCtrl.setCustom);
avatarRouter.delete('/custom', avatarCtrl.clearCustom);
