import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
// import { authLimiter } from '../middlewares/rateLimit.middleware.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';

export const authRouter = Router();

// authRouter.use(authLimiter);

authRouter.post('/register', registerValidator, validate, auth.register);
authRouter.post('/login', loginValidator, validate, auth.login);
authRouter.post('/refresh', auth.refresh);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
