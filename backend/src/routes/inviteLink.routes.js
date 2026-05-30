import { Router } from 'express';
import * as ctrl from '../controllers/inviteLink.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  chatIdParam,
  createInviteLinkValidator,
  linkIdParams,
  codeParam,
  joinRequestCreateValidator,
  joinRequestDecisionParams,
} from '../validators/inviteLink.validator.js';

// Mounted under /chats/:id
export const chatInviteRouter = Router({ mergeParams: true });
chatInviteRouter.use(requireAuth);

chatInviteRouter.post(
  '/invite-links',
  createInviteLinkValidator, validate, ctrl.createLink,
);
chatInviteRouter.get(
  '/invite-links',
  chatIdParam, validate, ctrl.listLinks,
);
chatInviteRouter.delete(
  '/invite-links/:linkId',
  linkIdParams, validate, ctrl.revokeLink,
);

chatInviteRouter.post(
  '/join-requests',
  joinRequestCreateValidator, validate, ctrl.requestJoin,
);
chatInviteRouter.get(
  '/join-requests',
  chatIdParam, validate, ctrl.listJoinRequests,
);
chatInviteRouter.post(
  '/join-requests/:userId/approve',
  joinRequestDecisionParams, validate, ctrl.approveJoin,
);
chatInviteRouter.post(
  '/join-requests/:userId/reject',
  joinRequestDecisionParams, validate, ctrl.rejectJoin,
);

// Mounted under /invites
export const inviteRedeemRouter = Router();
inviteRedeemRouter.use(requireAuth);
inviteRedeemRouter.post(
  '/:code/join',
  codeParam, validate, ctrl.redeemLink,
);
