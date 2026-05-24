import { Router } from 'express';
import { param } from 'express-validator';
import * as ctrl from '../controllers/session.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';

export const sessionRouter = Router();
sessionRouter.use(requireAuth);

sessionRouter.get('/', ctrl.listMine);
sessionRouter.delete('/:id', [param('id').isUUID()], validate, ctrl.revoke);
sessionRouter.post('/revoke-others', ctrl.revokeOthers);
