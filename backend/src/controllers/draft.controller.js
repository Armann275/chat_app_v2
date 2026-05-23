import * as draftService from '../services/draft.service.js';

export async function get(req, res) {
  const draft = await draftService.get(req.user.id, req.params.id);
  res.json({ success: true, data: { draft } });
}

export async function save(req, res) {
  const draft = await draftService.save(req.user.id, req.params.id, req.body.content);
  res.json({ success: true, data: { draft } });
}

export async function clear(req, res) {
  await draftService.clear(req.user.id, req.params.id);
  res.json({ success: true, data: { cleared: true } });
}
