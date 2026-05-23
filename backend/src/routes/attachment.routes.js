import { Router } from 'express';
import * as attachmentCtrl from '../controllers/attachment.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';

export const uploadRouter = Router();
uploadRouter.use(requireAuth);
uploadRouter.post('/', uploadSingle, attachmentCtrl.upload);

// File serving is intentionally unauthenticated so that <img>/<audio>/<video>
// tags (which don't carry the bearer token) can load attachments. URLs are
// random UUIDs so they act as capability tokens.
export const uploadFileRouter = Router();
uploadFileRouter.get('/:filename', attachmentCtrl.serve);
