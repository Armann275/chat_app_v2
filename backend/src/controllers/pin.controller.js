import * as pinService from '../services/pin.service.js';

export async function pin(req, res) {
  await pinService.pin(req.user.id, req.params.id, req.params.msgId);
  res.status(201).json({ success: true, data: { pinned: true } });
}

export async function unpin(req, res) {
  await pinService.unpin(req.user.id, req.params.id, req.params.msgId);
  res.json({ success: true, data: { unpinned: true } });
}

export async function list(req, res) {
  const pins = await pinService.listPins(req.user.id, req.params.id);
  res.json({ success: true, data: { pins } });
}
