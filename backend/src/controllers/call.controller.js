import * as callService from '../services/call.service.js';

export async function initiate(req, res) {
  const call = await callService.initiate(req.user.id, req.params.id, req.body.type);
  res.status(201).json({ success: true, data: { call } });
}

export async function accept(req, res) {
  const call = await callService.accept(req.user.id, req.params.id);
  res.json({ success: true, data: { call } });
}

export async function reject(req, res) {
  const call = await callService.reject(req.user.id, req.params.id);
  res.json({ success: true, data: { call } });
}

export async function hangup(req, res) {
  const call = await callService.hangup(req.user.id, req.params.id);
  res.json({ success: true, data: { call } });
}

export async function listHistory(req, res) {
  const calls = await callService.listHistory(req.user.id, {
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { calls } });
}
