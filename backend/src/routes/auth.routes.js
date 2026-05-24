import { Router } from 'express';
import { body } from 'express-validator';
import * as auth from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
// import { authLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  registerValidator,
  loginValidator,
  verifyEmailValidator,
  resendCodeValidator,
} from '../validators/auth.validator.js';

const verify2faValidator = [
  body('token').isString().isLength({ min: 16, max: 200 }),
  body('code').isString().trim().isLength({ min: 6, max: 32 }),
];

export const authRouter = Router();

// authRouter.use(authLimiter);

authRouter.post('/register', registerValidator, validate, auth.register);
authRouter.post('/login', loginValidator, validate, auth.login);
authRouter.post('/2fa/verify', verify2faValidator, validate, auth.verify2fa);
authRouter.post('/verify-email', verifyEmailValidator, validate, auth.verifyEmail);
authRouter.post('/resend-code', resendCodeValidator, validate, auth.resendCode);
authRouter.post('/refresh', auth.refresh);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
