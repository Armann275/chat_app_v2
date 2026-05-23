import { Router } from 'express';
import * as friendCtrl from '../controllers/friend.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  sendRequestValidator,
  requestIdParam,
  userIdParam,
  listRequestsValidator,
  listFriendsValidator,
} from '../validators/friend.validator.js';

export const friendRequestRouter = Router();
friendRequestRouter.use(requireAuth);

friendRequestRouter.get('/', listRequestsValidator, validate, friendCtrl.listRequests);
friendRequestRouter.post('/', sendRequestValidator, validate, friendCtrl.sendRequest);
friendRequestRouter.delete('/:id', requestIdParam, validate, friendCtrl.cancelRequest);
friendRequestRouter.post('/:id/accept', requestIdParam, validate, friendCtrl.acceptRequest);
friendRequestRouter.post('/:id/reject', requestIdParam, validate, friendCtrl.rejectRequest);

export const friendRouter = Router();
friendRouter.use(requireAuth);

friendRouter.get('/', listFriendsValidator, validate, friendCtrl.listFriends);
friendRouter.delete('/:userId', userIdParam, validate, friendCtrl.removeFriend);
