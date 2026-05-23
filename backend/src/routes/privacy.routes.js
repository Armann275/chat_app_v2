import { Router } from 'express';
import * as privacyCtrl from '../controllers/privacy.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { updatePrivacyValidator } from '../validators/privacy.validator.js';

export const privacyRouter = Router();

privacyRouter.use(requireAuth);

privacyRouter.get('/', privacyCtrl.getMine);
privacyRouter.put('/', updatePrivacyValidator, validate, privacyCtrl.updateMine);
