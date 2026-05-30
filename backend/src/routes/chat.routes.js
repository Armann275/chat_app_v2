import { Router } from 'express';
import * as chatCtrl from '../controllers/chat.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  createDirectChatValidator,
  createGroupChatValidator,
  createChannelValidator,
  updateGroupValidator,
  setMemberRoleValidator,
  setDisappearingValidator,
  addMembersValidator,
  chatIdParam,
  chatIdAndUserIdParams,
  listChatsValidator,
} from '../validators/chat.validator.js';

export const chatRouter = Router();

chatRouter.use(requireAuth);

chatRouter.get('/', listChatsValidator, validate, chatCtrl.listMine);
chatRouter.get('/requests', listChatsValidator, validate, chatCtrl.listRequests);
chatRouter.post('/direct', createDirectChatValidator, validate, chatCtrl.createDirect);
chatRouter.post('/group', createGroupChatValidator, validate, chatCtrl.createGroup);
chatRouter.post('/channel', createChannelValidator, validate, chatCtrl.createChannel);
chatRouter.post('/:id/accept-request', chatIdParam, validate, chatCtrl.acceptRequest);
chatRouter.post('/:id/reject-request', chatIdParam, validate, chatCtrl.rejectRequest);
chatRouter.get('/:id', chatIdParam, validate, chatCtrl.getOne);
chatRouter.patch('/:id', updateGroupValidator, validate, chatCtrl.updateGroup);
chatRouter.get('/:id/members', chatIdParam, validate, chatCtrl.getMembers);
chatRouter.post('/:id/members', addMembersValidator, validate, chatCtrl.addMembers);
chatRouter.delete(
  '/:id/members/:userId',
  chatIdAndUserIdParams,
  validate,
  chatCtrl.removeMember,
);
chatRouter.patch(
  '/:id/members/:userId/role',
  setMemberRoleValidator,
  validate,
  chatCtrl.setMemberRole,
);
chatRouter.post('/:id/leave', chatIdParam, validate, chatCtrl.leave);
chatRouter.patch(
  '/:id/disappearing',
  setDisappearingValidator,
  validate,
  chatCtrl.setDisappearing,
);
