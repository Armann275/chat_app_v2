import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { correlationId, requestLogger } from './middlewares/requestLogger.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { chatMessageRouter, messageRouter, chatRootRouter } from './routes/message.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { uploadRouter, uploadFileRouter } from './routes/attachment.routes.js';
import { friendRequestRouter, friendRouter } from './routes/friend.routes.js';
import { privacyRouter } from './routes/privacy.routes.js';
import { avatarRouter } from './routes/avatar.routes.js';
import { locationRouter, mapRouter } from './routes/location.routes.js';
import { chatInviteRouter, inviteRedeemRouter } from './routes/inviteLink.routes.js';
import { chatPollRouter, pollRouter } from './routes/poll.routes.js';
import { userBlockRouter, meBlockRouter } from './routes/block.routes.js';
import { sessionRouter } from './routes/session.routes.js';
import { totpRouter } from './routes/totp.routes.js';

export const app = express();

const allowedOrigins = env.corsOrigin.split(',').map((s) => s.trim()).filter(Boolean);

function corsOriginCheck(origin, cb) {
  if (!origin) return cb(null, true);
  if (allowedOrigins.includes(origin)) return cb(null, true);
  if (!env.isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return cb(null, true);
  }
  return cb(new Error(`Origin ${origin} not allowed by CORS`));
}

app.use(helmet());
app.use(cors({ origin: corsOriginCheck, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(correlationId);
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/auth', authRouter);
app.use('/users', userRouter);
app.use('/chats', chatRouter);
app.use('/chats/:id/messages', chatMessageRouter);
app.use('/chats/:id', chatInviteRouter);
app.use('/chats/:id', chatPollRouter);
app.use('/chats/:id', chatRootRouter);
app.use('/invites', inviteRedeemRouter);
app.use('/polls', pollRouter);
app.use('/messages', messageRouter);
app.use('/sync', syncRouter);
app.use('/uploads/files', uploadFileRouter);
app.use('/uploads', uploadRouter);
app.use('/friend-requests', friendRequestRouter);
app.use('/friends', friendRouter);
app.use('/me/privacy', privacyRouter);
app.use('/me/avatar', avatarRouter);
app.use('/me/location', locationRouter);
app.use('/me', meBlockRouter);
app.use('/me/sessions', sessionRouter);
app.use('/me/2fa', totpRouter);
app.use('/users/:id', userBlockRouter);
app.use('/map', mapRouter);

app.use(notFoundHandler);
app.use(errorHandler);
