import * as starService from '../services/star.service.js';

export async function star(req, res) {
  await starService.star(req.user.id, req.params.msgId);
  res.status(201).json({ success: true, data: { starred: true } });
}

export async function unstar(req, res) {
  await starService.unstar(req.user.id, req.params.msgId);
  res.json({ success: true, data: { unstarred: true } });
}

export async function list(req, res) {
  const messages = await starService.listStarred(req.user.id, {
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { messages } });
}
