import * as aiService from '../services/aiAssistant.service.js';

export async function createSession(req, res) {
  const session = await aiService.createSession(req.user.id);
  res.status(201).json({ success: true, data: { session } });
}

export async function listSessions(req, res) {
  const sessions = await aiService.listSessions(req.user.id, {
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { sessions } });
}

export async function getSession(req, res) {
  const data = await aiService.getSessionWithMessages(req.user.id, req.params.id);
  res.json({ success: true, data });
}

export async function deleteSession(req, res) {
  await aiService.deleteSession(req.user.id, req.params.id);
  res.json({ success: true, data: { deleted: true } });
}

export async function sendMessage(req, res) {
  const result = await aiService.sendMessage(
    req.user.id,
    req.params.id,
    req.body.content,
  );
  res.status(201).json({ success: true, data: result });
}
