import { Router } from 'express';
import { body } from 'express-validator';
import * as ctrl from '../controllers/totp.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

const codeValidator = [body('code').isString().trim().isLength({ min: 6, max: 32 })];

export const totpRouter = Router();
totpRouter.use(requireAuth);

totpRouter.get('/status', ctrl.status);
totpRouter.post('/setup', ctrl.beginSetup);
totpRouter.post('/enable', codeValidator, validate, ctrl.enable);
totpRouter.post('/disable', codeValidator, validate, ctrl.disable);
totpRouter.post('/backup-codes/regenerate', ctrl.regenerateBackupCodes);
