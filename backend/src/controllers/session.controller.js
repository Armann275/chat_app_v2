import * as sessionService from '../services/session.service.js';

const REFRESH_COOKIE = 'refreshToken';

export async function listMine(req, res) {
  const sessions = await sessionService.listMine(
    req.user.id, req.cookies?.[REFRESH_COOKIE],
  );
  res.json({ success: true, data: { sessions } });
}

export async function revoke(req, res) {
  const result = await sessionService.revoke(req.user.id, req.params.id);
  res.json({ success: true, data: result });
}

export async function revokeOthers(req, res) {
  const result = await sessionService.revokeOthers(
    req.user.id, req.cookies?.[REFRESH_COOKIE],
  );
  res.json({ success: true, data: result });
}
