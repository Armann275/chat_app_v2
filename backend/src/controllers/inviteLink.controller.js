import * as inviteService from '../services/inviteLink.service.js';
import * as joinService from '../services/joinRequest.service.js';

export async function createLink(req, res) {
  const link = await inviteService.create(req.user.id, req.params.id, {
    expiresAt: req.body.expiresAt,
    maxUses: req.body.maxUses,
  });
  res.status(201).json({ success: true, data: { link } });
}

export async function listLinks(req, res) {
  const links = await inviteService.list(req.user.id, req.params.id);
  res.json({ success: true, data: { links } });
}

export async function revokeLink(req, res) {
  const link = await inviteService.revoke(
    req.user.id, req.params.id, req.params.linkId,
  );
  res.json({ success: true, data: { link } });
}

export async function redeemLink(req, res) {
  const result = await inviteService.redeem(req.user.id, req.params.code);
  res.json({ success: true, data: result });
}

export async function requestJoin(req, res) {
  const result = await joinService.request(req.user.id, req.params.id, {
    message: req.body.message,
  });
  res.status(201).json({ success: true, data: result });
}

export async function listJoinRequests(req, res) {
  const requests = await joinService.listPending(req.user.id, req.params.id);
  res.json({ success: true, data: { requests } });
}

export async function approveJoin(req, res) {
  const request = await joinService.approve(
    req.user.id, req.params.id, req.params.userId,
  );
  res.json({ success: true, data: { request } });
}

export async function rejectJoin(req, res) {
  const request = await joinService.reject(
    req.user.id, req.params.id, req.params.userId,
  );
  res.json({ success: true, data: { request } });
}
