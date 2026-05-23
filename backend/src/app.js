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

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
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
app.use('/chats/:id', chatRootRouter);
app.use('/messages', messageRouter);
app.use('/sync', syncRouter);
app.use('/uploads/files', uploadFileRouter);
app.use('/uploads', uploadRouter);
app.use('/friend-requests', friendRequestRouter);
app.use('/friends', friendRouter);
app.use('/me/privacy', privacyRouter);

app.use(notFoundHandler);
app.use(errorHandler);
