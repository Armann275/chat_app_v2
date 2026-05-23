import * as friendService from '../services/friend.service.js';

export async function sendRequest(req, res) {
  const result = await friendService.sendRequest(req.user.id, req.body.toUserId);
  res.status(201).json({ success: true, data: { request: result } });
}

export async function listRequests(req, res) {
  const direction = req.query.direction === 'outgoing' ? 'outgoing' : 'incoming';
  const opts = {
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  };
  const requests = direction === 'outgoing'
    ? await friendService.listOutgoing(req.user.id, opts)
    : await friendService.listIncoming(req.user.id, opts);
  res.json({ success: true, data: { requests, direction } });
}

export async function cancelRequest(req, res) {
  const result = await friendService.cancelRequest(req.user.id, req.params.id);
  res.json({ success: true, data: result });
}

export async function acceptRequest(req, res) {
  const result = await friendService.acceptRequest(req.user.id, req.params.id);
  res.json({ success: true, data: result });
}

export async function rejectRequest(req, res) {
  const result = await friendService.rejectRequest(req.user.id, req.params.id);
  res.json({ success: true, data: result });
}

export async function listFriends(req, res) {
  const friends = await friendService.listFriends(req.user.id, {
    limit: req.query.limit ?? 100,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { friends } });
}

export async function removeFriend(req, res) {
  const result = await friendService.removeFriend(req.user.id, req.params.userId);
  res.json({ success: true, data: result });
}
